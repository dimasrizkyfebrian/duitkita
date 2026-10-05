package service_test

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
)

func newUserService(t *testing.T) (service.UserService, *mocks.UserRepository, *svcmocks.SecurityAuditService, *svcmocks.FileStorage) {
	userRepo := mocks.NewUserRepository(t)
	auditSvc := svcmocks.NewSecurityAuditService(t)
	storage := svcmocks.NewFileStorage(t)
	// Deliberately unreachable rather than mocked — the service treats any
	// Redis error as a cache miss/best-effort write failure, so pointing at
	// a closed port exercises exactly that fallback path for free instead
	// of needing a fake Redis server. Retries disabled and dial timeout cut
	// short so that fallback stays fast instead of burning through
	// go-redis's default 5-attempt backoff on every call.
	redisClient := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		MaxRetries:  -1,
		DialTimeout: 100 * time.Millisecond,
	})
	t.Cleanup(func() { _ = redisClient.Close() })
	return service.NewUserService(userRepo, auditSvc, storage, redisClient), userRepo, auditSvc, storage
}

// openMultipartFile builds a real multipart form in memory and parses it
// back out, so tests exercise the actual multipart.File/FileHeader types
// UploadAvatar receives from Gin instead of a hand-rolled fake.
func openMultipartFile(t *testing.T, fieldName, filename, contentType string, content []byte) (multipart.File, *multipart.FileHeader) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreatePart(map[string][]string{
		"Content-Disposition": {`form-data; name="` + fieldName + `"; filename="` + filename + `"`},
		"Content-Type":        {contentType},
	})
	require.NoError(t, err)
	_, err = part.Write(content)
	require.NoError(t, err)
	require.NoError(t, w.Close())

	r := multipart.NewReader(&buf, w.Boundary())
	form, err := r.ReadForm(int64(len(content)) + 1024)
	require.NoError(t, err)
	t.Cleanup(func() { _ = form.RemoveAll() })

	header := form.File[fieldName][0]
	file, err := header.Open()
	require.NoError(t, err)
	t.Cleanup(func() { _ = file.Close() })

	return file, header
}

func TestUserService_GetProfile(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc, userRepo, _, _ := newUserService(t)
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(&domain.User{ID: "user-1", Name: "Alice"}, nil)

		res, err := svc.GetProfile(context.Background(), "user-1")

		require.NoError(t, err)
		require.Equal(t, "Alice", res.Name)
	})

	t.Run("not found", func(t *testing.T) {
		svc, userRepo, _, _ := newUserService(t)
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(nil, nil)

		_, err := svc.GetProfile(context.Background(), "user-1")

		requireAppError(t, err, http.StatusNotFound, "user not found")
	})
}

func TestUserService_UpdateProfile(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc, userRepo, _, _ := newUserService(t)
		user := &domain.User{ID: "user-1", Name: "Alice"}
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
		userRepo.EXPECT().Update(context.Background(), user).Return(nil)

		res, err := svc.UpdateProfile(context.Background(), "user-1", request.UpdateProfileRequest{Name: "Alicia"})

		require.NoError(t, err)
		require.Equal(t, "Alicia", res.Name)
	})

	t.Run("user not found", func(t *testing.T) {
		svc, userRepo, _, _ := newUserService(t)
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(nil, nil)

		_, err := svc.UpdateProfile(context.Background(), "user-1", request.UpdateProfileRequest{Name: "Alicia"})

		requireAppError(t, err, http.StatusNotFound, "user not found")
	})
}

func TestUserService_ChangePassword(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("oldpass123"), bcrypt.DefaultCost)
	require.NoError(t, err)

	t.Run("success rehashes and audits the change", func(t *testing.T) {
		svc, userRepo, auditSvc, _ := newUserService(t)
		user := &domain.User{ID: "user-1", PasswordHash: string(hash)}
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
		userRepo.EXPECT().Update(context.Background(), user).RunAndReturn(func(_ context.Context, u *domain.User) error {
			require.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte("newpass123")))
			return nil
		})
		userID := "user-1"
		auditSvc.EXPECT().LogEvent(context.Background(), &userID, domain.SecurityAuditEventPasswordChanged, "", "", mock.Anything).Return()

		err := svc.ChangePassword(context.Background(), "user-1", request.ChangePasswordRequest{CurrentPassword: "oldpass123", NewPassword: "newpass123"})

		require.NoError(t, err)
	})

	t.Run("wrong current password rejected", func(t *testing.T) {
		svc, userRepo, _, _ := newUserService(t)
		user := &domain.User{ID: "user-1", PasswordHash: string(hash)}
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)

		err := svc.ChangePassword(context.Background(), "user-1", request.ChangePasswordRequest{CurrentPassword: "wrong", NewPassword: "newpass123"})

		requireAppError(t, err, http.StatusUnauthorized, "current password is incorrect")
	})
}

func TestUserService_UploadAvatar(t *testing.T) {
	svc, userRepo, _, storage := newUserService(t)
	user := &domain.User{ID: "user-1"}
	userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
	storage.EXPECT().Upload(context.Background(), "avatars/user-1.png", mockMatchByType[multipart.File](), "image/png").Return("", nil)
	userRepo.EXPECT().Update(context.Background(), user).RunAndReturn(func(_ context.Context, u *domain.User) error {
		require.Equal(t, "avatars/user-1.png", *u.AvatarStorageKey)
		return nil
	})

	file, header := openMultipartFile(t, "avatar", "photo.png", "image/png", []byte("fake-png-bytes"))

	res, err := svc.UploadAvatar(context.Background(), "user-1", file, header)

	require.NoError(t, err)
	require.Equal(t, "user-1", res.ID)
}

func TestUserService_DeleteAvatar(t *testing.T) {
	t.Run("no-op when there is no avatar", func(t *testing.T) {
		svc, userRepo, _, _ := newUserService(t)
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(&domain.User{ID: "user-1"}, nil)

		err := svc.DeleteAvatar(context.Background(), "user-1")

		require.NoError(t, err)
	})

	t.Run("deletes from storage and clears the reference", func(t *testing.T) {
		svc, userRepo, _, storage := newUserService(t)
		key := "avatars/user-1.png"
		user := &domain.User{ID: "user-1", AvatarStorageKey: &key}
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
		storage.EXPECT().Delete(context.Background(), key).Return(nil)
		userRepo.EXPECT().Update(context.Background(), user).RunAndReturn(func(_ context.Context, u *domain.User) error {
			require.Nil(t, u.AvatarStorageKey)
			return nil
		})

		err := svc.DeleteAvatar(context.Background(), "user-1")

		require.NoError(t, err)
	})
}

func TestUserService_GetAvatarURL(t *testing.T) {
	t.Run("no avatar set", func(t *testing.T) {
		svc, userRepo, _, _ := newUserService(t)
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(&domain.User{ID: "user-1"}, nil)

		_, err := svc.GetAvatarURL(context.Background(), "user-1")

		requireAppError(t, err, http.StatusNotFound, "user has no avatar")
	})

	t.Run("success", func(t *testing.T) {
		svc, userRepo, _, storage := newUserService(t)
		key := "avatars/user-1.png"
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(&domain.User{ID: "user-1", AvatarStorageKey: &key}, nil)
		storage.EXPECT().SignedURL(key, 15*time.Minute).Return("https://signed.example/avatar.png", nil)

		url, err := svc.GetAvatarURL(context.Background(), "user-1")

		require.NoError(t, err)
		require.Equal(t, "https://signed.example/avatar.png", url)
	})
}

func TestUserService_GetAvatarURL_CachesAndInvalidates(t *testing.T) {
	mr := miniredis.RunT(t)
	redisClient := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = redisClient.Close() })

	userRepo := mocks.NewUserRepository(t)
	auditSvc := svcmocks.NewSecurityAuditService(t)
	storage := svcmocks.NewFileStorage(t)
	svc := service.NewUserService(userRepo, auditSvc, storage, redisClient)

	key := "avatars/user-1.png"
	user := &domain.User{ID: "user-1", AvatarStorageKey: &key}

	userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
	storage.EXPECT().SignedURL(key, 15*time.Minute).Return("https://signed.example/v1.png", nil).Once()

	url1, err := svc.GetAvatarURL(context.Background(), "user-1")
	require.NoError(t, err)
	require.Equal(t, "https://signed.example/v1.png", url1)

	// Second call should hit the cache — SignedURL is mocked .Once() above,
	// so a second call to it would fail this test.
	userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
	url2, err := svc.GetAvatarURL(context.Background(), "user-1")
	require.NoError(t, err)
	require.Equal(t, url1, url2)

	// Replacing the avatar invalidates the cache.
	userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
	storage.EXPECT().Upload(context.Background(), key, mock.Anything, mock.Anything).Return("", nil)
	userRepo.EXPECT().Update(context.Background(), user).Return(nil)
	file, header := openMultipartFile(t, "avatar", "photo.png", "image/png", []byte("new-bytes"))
	_, err = svc.UploadAvatar(context.Background(), "user-1", file, header)
	require.NoError(t, err)

	// So the next read regenerates instead of reusing the stale cache entry.
	userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(user, nil)
	storage.EXPECT().SignedURL(key, 15*time.Minute).Return("https://signed.example/v2.png", nil).Once()

	url3, err := svc.GetAvatarURL(context.Background(), "user-1")
	require.NoError(t, err)
	require.Equal(t, "https://signed.example/v2.png", url3)
}

func TestUserService_GetSecurityAudit(t *testing.T) {
	svc, _, auditSvc, _ := newUserService(t)
	auditSvc.EXPECT().ListByUser(context.Background(), "user-1", 50).Return([]domain.SecurityAuditLog{
		{ID: "log-1", EventType: domain.SecurityAuditEventLoginSuccess, IPAddress: strPtr("1.2.3.4")},
	}, nil)

	res, err := svc.GetSecurityAudit(context.Background(), "user-1")

	require.NoError(t, err)
	require.Len(t, res, 1)
	require.Equal(t, "log-1", res[0].ID)
	require.Equal(t, "login_success", res[0].EventType)
	require.Equal(t, "1.2.3.4", res[0].IPAddress)
}
