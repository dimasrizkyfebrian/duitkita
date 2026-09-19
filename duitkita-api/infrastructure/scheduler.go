package infrastructure

import (
	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog"
)

// Scheduler wraps robfig/cron so worker/ can register jobs without every
// job needing to know about cron's setup/logging boilerplate.
type Scheduler struct {
	cron   *cron.Cron
	logger zerolog.Logger
}

func NewScheduler(logger zerolog.Logger) *Scheduler {
	return &Scheduler{
		cron:   cron.New(cron.WithSeconds()),
		logger: logger,
	}
}

// Register adds a job on the given cron spec (with seconds field, e.g.
// "0 */5 * * * *" = every 5 minutes). Panics from the job are recovered so
// one bad run doesn't kill the whole scheduler.
func (s *Scheduler) Register(name, spec string, job func()) error {
	_, err := s.cron.AddFunc(spec, func() {
		defer func() {
			if r := recover(); r != nil {
				s.logger.Error().Interface("panic", r).Str("job", name).Msg("scheduled job panicked")
			}
		}()
		s.logger.Info().Str("job", name).Msg("running scheduled job")
		job()
	})
	return err
}

func (s *Scheduler) Start() {
	s.cron.Start()
}

func (s *Scheduler) Stop() {
	s.cron.Stop()
}
