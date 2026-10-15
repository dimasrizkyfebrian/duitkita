package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type RecurringExpenseService interface {
	Create(ctx context.Context, userID string, req request.CreateRecurringExpenseRequest) (*response.RecurringExpenseResponse, error)
	List(ctx context.Context, userID string, limit, offset int) ([]response.RecurringExpenseResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.RecurringExpenseResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateRecurringExpenseRequest) (*response.RecurringExpenseResponse, error)
	Delete(ctx context.Context, userID, id string) error
	Pause(ctx context.Context, userID, id string) error
	Resume(ctx context.Context, userID, id string) error
	// RunDue processes every user's due recurring expenses — only the
	// internal Cloud Scheduler job should call this.
	RunDue(ctx context.Context) (int, error)
	// RunDueForUser is the user-facing "run my due items now" trigger,
	// scoped to that one caller — it must never reach across accounts the
	// way an unscoped RunDue call from a normal request would.
	RunDueForUser(ctx context.Context, userID string) (int, error)
}

type recurringExpenseService struct {
	repo         repository.RecurringExpenseRepository
	categoryRepo repository.CategoryRepository
	budgetRepo   repository.BudgetRepository
	expenseRepo  repository.ExpenseRepository
	notifSvc     NotificationService
}

func NewRecurringExpenseService(repo repository.RecurringExpenseRepository, categoryRepo repository.CategoryRepository, budgetRepo repository.BudgetRepository, expenseRepo repository.ExpenseRepository, notifSvc NotificationService) RecurringExpenseService {
	return &recurringExpenseService{repo: repo, categoryRepo: categoryRepo, budgetRepo: budgetRepo, expenseRepo: expenseRepo, notifSvc: notifSvc}
}

func (s *recurringExpenseService) Create(ctx context.Context, userID string, req request.CreateRecurringExpenseRequest) (*response.RecurringExpenseResponse, error) {
	category, err := s.categoryRepo.FindByID(ctx, req.CategoryID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up category")
	}
	if category == nil || category.UserID != userID {
		return nil, utils.ErrNotFound("category not found")
	}

	scheduleType := domain.RecurringScheduleType(req.ScheduleType)
	re := &domain.RecurringExpense{
		ID:           uuid.NewString(),
		UserID:       userID,
		CategoryID:   req.CategoryID,
		Amount:       req.Amount,
		Note:         utils.StringPtr(req.Note),
		ScheduleType: scheduleType,
		ScheduleDay:  req.ScheduleDay,
		NextRunAt:    computeNextRun(scheduleType, req.ScheduleDay, time.Now()),
		IsActive:     true,
	}
	if err := s.repo.Create(ctx, re); err != nil {
		return nil, utils.ErrInternal("failed to create recurring expense")
	}

	res := toRecurringExpenseResponse(re)
	return &res, nil
}

func (s *recurringExpenseService) List(ctx context.Context, userID string, limit, offset int) ([]response.RecurringExpenseResponse, error) {
	items, err := s.repo.FindAllByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, utils.ErrInternal("failed to list recurring expenses")
	}
	out := make([]response.RecurringExpenseResponse, 0, len(items))
	for i := range items {
		out = append(out, toRecurringExpenseResponse(&items[i]))
	}
	return out, nil
}

func (s *recurringExpenseService) GetByID(ctx context.Context, userID, id string) (*response.RecurringExpenseResponse, error) {
	re, err := s.mustOwnRecurringExpense(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	res := toRecurringExpenseResponse(re)
	return &res, nil
}

func (s *recurringExpenseService) Update(ctx context.Context, userID, id string, req request.UpdateRecurringExpenseRequest) (*response.RecurringExpenseResponse, error) {
	re, err := s.mustOwnRecurringExpense(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	if req.Amount != 0 {
		re.Amount = req.Amount
	}
	if req.Note != "" {
		re.Note = utils.StringPtr(req.Note)
	}
	if req.ScheduleDay != 0 {
		re.ScheduleDay = req.ScheduleDay
		re.NextRunAt = computeNextRun(re.ScheduleType, re.ScheduleDay, time.Now())
	}

	if err := s.repo.Update(ctx, re); err != nil {
		return nil, utils.ErrInternal("failed to update recurring expense")
	}

	res := toRecurringExpenseResponse(re)
	return &res, nil
}

func (s *recurringExpenseService) Delete(ctx context.Context, userID, id string) error {
	if _, err := s.mustOwnRecurringExpense(ctx, userID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

func (s *recurringExpenseService) Pause(ctx context.Context, userID, id string) error {
	re, err := s.mustOwnRecurringExpense(ctx, userID, id)
	if err != nil {
		return err
	}
	re.IsActive = false
	return s.repo.Update(ctx, re)
}

func (s *recurringExpenseService) Resume(ctx context.Context, userID, id string) error {
	re, err := s.mustOwnRecurringExpense(ctx, userID, id)
	if err != nil {
		return err
	}
	re.IsActive = true
	re.NextRunAt = computeNextRun(re.ScheduleType, re.ScheduleDay, time.Now())
	return s.repo.Update(ctx, re)
}

func (s *recurringExpenseService) RunDue(ctx context.Context) (int, error) {
	now := time.Now()
	due, err := s.repo.FindDue(ctx, now)
	if err != nil {
		return 0, utils.ErrInternal("failed to load due recurring expenses")
	}
	return s.processDue(ctx, due, now), nil
}

func (s *recurringExpenseService) RunDueForUser(ctx context.Context, userID string) (int, error) {
	now := time.Now()
	due, err := s.repo.FindDueByUserID(ctx, userID, now)
	if err != nil {
		return 0, utils.ErrInternal("failed to load due recurring expenses")
	}
	return s.processDue(ctx, due, now), nil
}

func (s *recurringExpenseService) processDue(ctx context.Context, due []domain.RecurringExpense, now time.Time) int {
	processed := 0
	for i := range due {
		re := &due[i]

		category, err := s.categoryRepo.FindByID(ctx, re.CategoryID)
		if err != nil {
			log.Error().Err(err).Str("recurring_expense_id", re.ID).Msg("failed to look up category for recurring expense")
			continue
		}
		categoryName := "this category"
		if category != nil {
			categoryName = category.Name
		}

		budget, err := s.budgetRepo.FindByUserCategoryPeriod(ctx, re.UserID, re.CategoryID, now.Year(), int(now.Month()))
		if err != nil {
			log.Error().Err(err).Str("recurring_expense_id", re.ID).Msg("failed to look up budget for recurring expense")
			continue
		}
		if budget == nil {
			// Not recorded — there's nothing to attach the expense to — but
			// the occurrence must not just vanish: the user gets told so
			// they can set the budget and catch up manually, instead of
			// silently losing track of a bill they thought was automated.
			s.notify(ctx, re.UserID, "Recurring expense skipped",
				fmt.Sprintf("Your recurring %s expense wasn't recorded — set a budget for this month first.", categoryName))
		} else {
			expense := &domain.Expense{
				ID:              uuid.NewString(),
				UserID:          re.UserID,
				CategoryID:      re.CategoryID,
				MonthlyBudgetID: budget.ID,
				Amount:          re.Amount,
				Note:            re.Note,
				ExpenseDate:     now,
			}
			if err := s.expenseRepo.Create(ctx, expense); err != nil {
				log.Error().Err(err).Str("recurring_expense_id", re.ID).Msg("failed to create expense from recurring expense")
				continue
			}
			s.notify(ctx, re.UserID, "Recurring expense recorded",
				fmt.Sprintf("%s was recorded automatically.", categoryName))
		}

		re.LastRunAt = &now
		re.NextRunAt = computeNextRun(re.ScheduleType, re.ScheduleDay, now)
		if err := s.repo.Update(ctx, re); err != nil {
			log.Error().Err(err).Str("recurring_expense_id", re.ID).Msg("failed to advance recurring expense schedule")
			continue
		}
		processed++
	}

	return processed
}

// notify is best-effort: a failure to create the in-app notification must
// never undo (or get treated as a reason to retry) the expense create/skip
// decision already made above — it's only logged.
func (s *recurringExpenseService) notify(ctx context.Context, userID, title, body string) {
	if err := s.notifSvc.Create(ctx, userID, domain.NotificationTypeRecurringExpense, title, body); err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("failed to send recurring expense notification")
	}
}

func (s *recurringExpenseService) mustOwnRecurringExpense(ctx context.Context, userID, id string) (*domain.RecurringExpense, error) {
	re, err := s.repo.FindByID(ctx, id)
	return mustOwn(re, err, userID, "recurring expense not found")
}

func computeNextRun(scheduleType domain.RecurringScheduleType, scheduleDay int, from time.Time) time.Time {
	if scheduleType == domain.RecurringScheduleWeekly {
		daysUntil := (scheduleDay - int(from.Weekday()) + 7) % 7
		if daysUntil == 0 {
			daysUntil = 7
		}
		return from.AddDate(0, 0, daysUntil)
	}

	next := time.Date(from.Year(), from.Month(), 1, 0, 0, 0, 0, from.Location()).AddDate(0, 1, 0)
	lastDayOfMonth := next.AddDate(0, 1, -1).Day()
	day := scheduleDay
	if day > lastDayOfMonth {
		day = lastDayOfMonth
	}
	return time.Date(next.Year(), next.Month(), day, 0, 0, 0, 0, from.Location())
}

func toRecurringExpenseResponse(re *domain.RecurringExpense) response.RecurringExpenseResponse {
	res := response.RecurringExpenseResponse{
		ID:           re.ID,
		CategoryID:   re.CategoryID,
		Amount:       re.Amount,
		ScheduleType: string(re.ScheduleType),
		ScheduleDay:  re.ScheduleDay,
		NextRunAt:    re.NextRunAt,
		LastRunAt:    re.LastRunAt,
		IsActive:     re.IsActive,
		CreatedAt:    re.CreatedAt,
	}
	if re.Note != nil {
		res.Note = *re.Note
	}
	return res
}
