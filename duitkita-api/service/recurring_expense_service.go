package service

import (
	"context"
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
	List(ctx context.Context, userID string) ([]response.RecurringExpenseResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.RecurringExpenseResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateRecurringExpenseRequest) (*response.RecurringExpenseResponse, error)
	Delete(ctx context.Context, userID, id string) error
	Pause(ctx context.Context, userID, id string) error
	Resume(ctx context.Context, userID, id string) error
	RunDue(ctx context.Context) (int, error)
}

type recurringExpenseService struct {
	repo         repository.RecurringExpenseRepository
	categoryRepo repository.CategoryRepository
	budgetRepo   repository.BudgetRepository
	expenseRepo  repository.ExpenseRepository
}

func NewRecurringExpenseService(repo repository.RecurringExpenseRepository, categoryRepo repository.CategoryRepository, budgetRepo repository.BudgetRepository, expenseRepo repository.ExpenseRepository) RecurringExpenseService {
	return &recurringExpenseService{repo: repo, categoryRepo: categoryRepo, budgetRepo: budgetRepo, expenseRepo: expenseRepo}
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

func (s *recurringExpenseService) List(ctx context.Context, userID string) ([]response.RecurringExpenseResponse, error) {
	items, err := s.repo.FindAllByUserID(ctx, userID)
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
	re, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	res := toRecurringExpenseResponse(re)
	return &res, nil
}

func (s *recurringExpenseService) Update(ctx context.Context, userID, id string, req request.UpdateRecurringExpenseRequest) (*response.RecurringExpenseResponse, error) {
	re, err := s.mustOwn(ctx, userID, id)
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
	if _, err := s.mustOwn(ctx, userID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

func (s *recurringExpenseService) Pause(ctx context.Context, userID, id string) error {
	re, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return err
	}
	re.IsActive = false
	return s.repo.Update(ctx, re)
}

func (s *recurringExpenseService) Resume(ctx context.Context, userID, id string) error {
	re, err := s.mustOwn(ctx, userID, id)
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

	processed := 0
	for i := range due {
		re := &due[i]

		budget, err := s.budgetRepo.FindByUserCategoryPeriod(ctx, re.UserID, re.CategoryID, now.Year(), int(now.Month()))
		if err != nil {
			log.Error().Err(err).Str("recurring_expense_id", re.ID).Msg("failed to look up budget for recurring expense")
			continue
		}
		if budget == nil {
			log.Warn().Str("recurring_expense_id", re.ID).Msg("no matching budget found, skipping expense creation")
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
		}

		re.LastRunAt = &now
		re.NextRunAt = computeNextRun(re.ScheduleType, re.ScheduleDay, now)
		if err := s.repo.Update(ctx, re); err != nil {
			log.Error().Err(err).Str("recurring_expense_id", re.ID).Msg("failed to advance recurring expense schedule")
			continue
		}
		processed++
	}

	return processed, nil
}

func (s *recurringExpenseService) mustOwn(ctx context.Context, userID, id string) (*domain.RecurringExpense, error) {
	re, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up recurring expense")
	}
	if re == nil || re.UserID != userID {
		return nil, utils.ErrNotFound("recurring expense not found")
	}
	return re, nil
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
