package infrastructure

import (
	"context"
	"fmt"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"

	"duitkita-api/config"
)

type CloudTasksEnqueuer struct {
	client       *cloudtasks.Client
	queuePath    string
	targetURL    string
	internalAuth string
}

func NewCloudTasksEnqueuer(ctx context.Context, cfg config.CloudTasksConfig, internalSecret string) (*CloudTasksEnqueuer, error) {
	client, err := cloudtasks.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("create cloud tasks client: %w", err)
	}

	return &CloudTasksEnqueuer{
		client:       client,
		queuePath:    fmt.Sprintf("projects/%s/locations/%s/queues/%s", cfg.ProjectID, cfg.LocationID, cfg.QueueID),
		targetURL:    cfg.TargetBaseURL,
		internalAuth: internalSecret,
	}, nil
}

func (e *CloudTasksEnqueuer) EnqueueReportExportRender(ctx context.Context, exportID string) error {
	url := fmt.Sprintf("%s/internal/jobs/report-exports/%s/render", e.targetURL, exportID)

	_, err := e.client.CreateTask(ctx, &cloudtaskspb.CreateTaskRequest{
		Parent: e.queuePath,
		Task: &cloudtaskspb.Task{
			MessageType: &cloudtaskspb.Task_HttpRequest{
				HttpRequest: &cloudtaskspb.HttpRequest{
					Url:        url,
					HttpMethod: cloudtaskspb.HttpMethod_POST,
					Headers: map[string]string{
						"Content-Type":      "application/json",
						"X-Internal-Secret": e.internalAuth,
					},
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("create cloud task for export %s: %w", exportID, err)
	}
	return nil
}

func (e *CloudTasksEnqueuer) Close() error {
	return e.client.Close()
}
