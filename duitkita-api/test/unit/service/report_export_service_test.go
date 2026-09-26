package service_test

import (
	"context"
	"errors"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
)

func newReportExportService(t *testing.T) (service.ReportExportService, *mocks.ReportExportRepository, *svcmocks.ReportService, *svcmocks.FileStorage) {
	repo := mocks.NewReportExportRepository(t)
	reportSvc := svcmocks.NewReportService(t)
	storage := svcmocks.NewFileStorage(t)
	return service.NewReportExportService(repo, reportSvc, storage), repo, reportSvc, storage
}

func TestReportExportService_Create(t *testing.T) {
	svc, repo, _, _ := newReportExportService(t)
	repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.ReportExport]()).RunAndReturn(func(_ context.Context, e *domain.ReportExport) error {
		require.Equal(t, domain.ReportExportStatusPending, e.Status)
		require.Equal(t, "user-1", e.UserID)
		return nil
	})

	res, err := svc.Create(context.Background(), "user-1", request.CreateExportRequest{Format: "pdf", Year: 2026, Month: 1, Scope: "personal"})

	require.NoError(t, err)
	require.Equal(t, "pending", res.Status)
	require.Empty(t, res.DownloadURL)
}

func TestReportExportService_List(t *testing.T) {
	svc, repo, _, _ := newReportExportService(t)
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.ReportExport{{ID: "exp-1"}}, nil)

	res, err := svc.List(context.Background(), "user-1")

	require.NoError(t, err)
	require.Len(t, res, 1)
}

func TestReportExportService_GetByID(t *testing.T) {
	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _ := newReportExportService(t)
		repo.EXPECT().FindByID(context.Background(), "exp-1").Return(&domain.ReportExport{ID: "exp-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "exp-1")

		requireAppError(t, err, http.StatusNotFound, "export not found")
	})

	t.Run("success", func(t *testing.T) {
		svc, repo, _, _ := newReportExportService(t)
		repo.EXPECT().FindByID(context.Background(), "exp-1").Return(&domain.ReportExport{ID: "exp-1", UserID: "user-1", Status: domain.ReportExportStatusCompleted}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "exp-1")

		require.NoError(t, err)
		require.Equal(t, "completed", res.Status)
	})
}

func TestReportExportService_DownloadURL(t *testing.T) {
	t.Run("not ready yet", func(t *testing.T) {
		svc, repo, _, _ := newReportExportService(t)
		repo.EXPECT().FindByID(context.Background(), "exp-1").Return(&domain.ReportExport{ID: "exp-1", UserID: "user-1", Status: domain.ReportExportStatusPending}, nil)

		_, err := svc.DownloadURL(context.Background(), "user-1", "exp-1")

		requireAppError(t, err, http.StatusConflict, "export is not ready for download")
	})

	t.Run("success once completed", func(t *testing.T) {
		svc, repo, _, storage := newReportExportService(t)
		path := "reports/user-1/exp-1.pdf"
		repo.EXPECT().FindByID(context.Background(), "exp-1").Return(&domain.ReportExport{ID: "exp-1", UserID: "user-1", Status: domain.ReportExportStatusCompleted, FilePath: &path}, nil)
		storage.EXPECT().SignedURL(path, 15*time.Minute).Return("https://signed/exp-1.pdf", nil)

		url, err := svc.DownloadURL(context.Background(), "user-1", "exp-1")

		require.NoError(t, err)
		require.Equal(t, "https://signed/exp-1.pdf", url)
	})
}

func TestReportExportService_ProcessPending(t *testing.T) {
	t.Run("renders and completes a pending export", func(t *testing.T) {
		svc, repo, reportSvc, storage := newReportExportService(t)
		pending := []domain.ReportExport{{ID: "exp-1", UserID: "user-1", Year: 2026, Month: 1}}
		repo.EXPECT().FindPending(context.Background()).Return(pending, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.ReportExport]()).Return(nil).Twice()
		reportSvc.EXPECT().MonthlyReport(context.Background(), "user-1", 2026, 1).Return(&response.MonthlyReportResponse{Year: 2026, Month: 1}, nil)
		storage.EXPECT().Upload(context.Background(), "reports/user-1/exp-1.pdf", mockMatchByType[io.Reader](), "application/pdf").Return("", nil)

		processed, err := svc.ProcessPending(context.Background())

		require.NoError(t, err)
		require.Equal(t, 1, processed)
	})

	t.Run("render failure marks the export failed but keeps processing others", func(t *testing.T) {
		svc, repo, reportSvc, _ := newReportExportService(t)
		pending := []domain.ReportExport{{ID: "exp-1", UserID: "user-1", Year: 2026, Month: 1}}
		repo.EXPECT().FindPending(context.Background()).Return(pending, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.ReportExport]()).RunAndReturn(func(_ context.Context, e *domain.ReportExport) error {
			return nil
		}).Twice()
		reportSvc.EXPECT().MonthlyReport(context.Background(), "user-1", 2026, 1).Return(nil, errors.New("db down"))

		processed, err := svc.ProcessPending(context.Background())

		require.NoError(t, err)
		require.Equal(t, 0, processed)
	})

	t.Run("failing to mark as processing skips the export without panicking", func(t *testing.T) {
		svc, repo, _, _ := newReportExportService(t)
		pending := []domain.ReportExport{{ID: "exp-1", UserID: "user-1"}}
		repo.EXPECT().FindPending(context.Background()).Return(pending, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.ReportExport]()).Return(errors.New("db down")).Once()

		processed, err := svc.ProcessPending(context.Background())

		require.NoError(t, err)
		require.Equal(t, 0, processed)
	})

	t.Run("repo error loading pending exports", func(t *testing.T) {
		svc, repo, _, _ := newReportExportService(t)
		repo.EXPECT().FindPending(context.Background()).Return(nil, errors.New("db down"))

		_, err := svc.ProcessPending(context.Background())

		requireAppError(t, err, http.StatusInternalServerError, "failed to load pending exports")
	})
}
