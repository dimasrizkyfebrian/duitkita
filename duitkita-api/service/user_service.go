package service

import (
	"context"
	"fmt"
	"mime/multipart"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

const (
	avatarSignedURLTTL = 15 * time.Minute
	// Shorter than avatarSignedURLTTL so a cache hit is never served right
	// up against (or past) the real signed URL's own expiry.
	avatarURLCacheTTL = 10 * time.Minute
)

type UserService interface {
	GetProfile(ctx context.Context, userID string) (*response.UserResponse, error)
	UpdateProfile(ctx context.Context, userID string, req request.UpdateProfileRequest) (*response.UserResponse, error)
	ChangePassword(ctx context.Context, userID string, req request.ChangePasswordRequest) error
	UploadAvatar(ctx context.Context, userID string, file multipart.File, header *multipart.FileHeader) (*response.UserResponse, error)
	DeleteAvatar(ctx context.Context, userID string) error
	GetAvatarURL(ctx context.Context, userID string) (string, error)
	GetSecurityAudit(ctx context.Context, userID string) ([]response.SecurityAuditLogResponse, error)
}

type userService struct {
	userRepo repository.UserRepository
	auditSvc SecurityAuditService
	storage  FileStorage
	redis    *redis.Client
}

func NewUserService(userRepo repository.UserRepository, auditSvc SecurityAuditService, storage FileStorage, redisClient *redis.Client) UserService {
	return &userService{userRepo: userRepo, auditSvc: auditSvc, storage: storage, redis: redisClient}
}

func (s *userService) GetProfile(ctx context.Context, userID string) (*response.UserResponse, error) {
	user, err := s.mustFindUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	res := toUserResponse(user)
	return &res, nil
}

func (s *userService) UpdateProfile(ctx context.Context, userID string, req request.UpdateProfileRequest) (*response.UserResponse, error) {
	user, err := s.mustFindUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	user.Name = req.Name
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, utils.ErrInternal("failed to update profile")
	}

	res := toUserResponse(user)
	return &res, nil
}

func (s *userService) ChangePassword(ctx context.Context, userID string, req request.ChangePasswordRequest) error {
	user, err := s.mustFindUser(ctx, userID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return utils.ErrUnauthorized("current password is incorrect")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return utils.ErrInternal("failed to hash password")
	}
	user.PasswordHash = string(hash)

	if err := s.userRepo.Update(ctx, user); err != nil {
		return utils.ErrInternal("failed to update password")
	}

	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventPasswordChanged, "", "", nil)
	return nil
}

func (s *userService) UploadAvatar(ctx context.Context, userID string, file multipart.File, header *multipart.FileHeader) (*response.UserResponse, error) {
	user, err := s.mustFindUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	objectKey := fmt.Sprintf("avatars/%s%s", userID, fileExt(header.Filename))
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	if _, err := s.storage.Upload(ctx, objectKey, file, contentType); err != nil {
		return nil, utils.ErrInternal("failed to upload avatar")
	}

	user.AvatarStorageKey = &objectKey
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, utils.ErrInternal("failed to save avatar reference")
	}
	s.redis.Del(ctx, avatarURLCacheKey(userID))

	res := toUserResponse(user)
	return &res, nil
}

func (s *userService) DeleteAvatar(ctx context.Context, userID string) error {
	user, err := s.mustFindUser(ctx, userID)
	if err != nil {
		return err
	}
	if user.AvatarStorageKey == nil {
		return nil
	}

	if err := s.storage.Delete(ctx, *user.AvatarStorageKey); err != nil {
		return utils.ErrInternal("failed to delete avatar")
	}

	user.AvatarStorageKey = nil
	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}
	s.redis.Del(ctx, avatarURLCacheKey(userID))
	return nil
}

// GetAvatarURL is called on essentially every page nav that renders an
// avatar, but the signed URL it returns only actually changes when the
// avatar itself does — so it's cached in Redis (invalidated by
// UploadAvatar/DeleteAvatar above) to skip the GCS signBlob round-trip on
// every hit. Caching is best-effort: a Redis miss or outage just falls
// through to generating a fresh signed URL, same as before this existed.
func (s *userService) GetAvatarURL(ctx context.Context, userID string) (string, error) {
	user, err := s.mustFindUser(ctx, userID)
	if err != nil {
		return "", err
	}
	if user.AvatarStorageKey == nil {
		return "", utils.ErrNotFound("user has no avatar")
	}

	cacheKey := avatarURLCacheKey(userID)
	if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		return cached, nil
	}

	url, err := s.storage.SignedURL(*user.AvatarStorageKey, avatarSignedURLTTL)
	if err != nil {
		return "", utils.ErrInternal("failed to generate avatar url")
	}

	s.redis.Set(ctx, cacheKey, url, avatarURLCacheTTL)
	return url, nil
}

func (s *userService) GetSecurityAudit(ctx context.Context, userID string) ([]response.SecurityAuditLogResponse, error) {
	logs, err := s.auditSvc.ListByUser(ctx, userID, 50)
	if err != nil {
		return nil, err
	}

	out := make([]response.SecurityAuditLogResponse, 0, len(logs))
	for _, log := range logs {
		item := response.SecurityAuditLogResponse{
			ID:        log.ID,
			EventType: string(log.EventType),
			Meta:      log.Meta,
			CreatedAt: log.CreatedAt,
		}
		if log.IPAddress != nil {
			item.IPAddress = *log.IPAddress
		}
		if log.UserAgent != nil {
			item.UserAgent = *log.UserAgent
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *userService) mustFindUser(ctx context.Context, userID string) (*domain.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up user")
	}
	if user == nil {
		return nil, utils.ErrNotFound("user not found")
	}
	return user, nil
}

func avatarURLCacheKey(userID string) string {
	return fmt.Sprintf("avatar_url:%s", userID)
}

func fileExt(filename string) string {
	for i := len(filename) - 1; i >= 0 && !isPathSeparator(filename[i]); i-- {
		if filename[i] == '.' {
			return filename[i:]
		}
	}
	return ""
}

func isPathSeparator(b byte) bool {
	return b == '/' || b == '\\'
}
