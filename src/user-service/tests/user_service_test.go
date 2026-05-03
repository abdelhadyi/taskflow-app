package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/taskflow/user-service/internal/model"
	"github.com/taskflow/user-service/internal/repository"
	"github.com/taskflow/user-service/internal/service"
)

// ── Mock repository ───────────────────────────────────────────────────────────
type mockUserRepo struct{ mock.Mock }

func (m *mockUserRepo) Create(ctx context.Context, u *model.User) (*model.User, error) {
	args := m.Called(ctx, u)
	if v := args.Get(0); v != nil {
		return v.(*model.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	args := m.Called(ctx, email)
	if v := args.Get(0); v != nil {
		return v.(*model.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *mockUserRepo) FindByID(ctx context.Context, id int64) (*model.User, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.(*model.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *mockUserRepo) Update(ctx context.Context, id int64, req *model.UpdateProfileRequest) (*model.User, error) {
	args := m.Called(ctx, id, req)
	if v := args.Get(0); v != nil {
		return v.(*model.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *mockUserRepo) List(ctx context.Context) ([]*model.User, error) {
	args := m.Called(ctx)
	if v := args.Get(0); v != nil {
		return v.([]*model.User), args.Error(1)
	}
	return nil, args.Error(1)
}

// ── Tests ─────────────────────────────────────────────────────────────────────
func TestRegister_Success(t *testing.T) {
	repo := new(mockUserRepo)
	svc  := service.NewUserService(repo)

	req := &model.RegisterRequest{Email: "alice@test.com", Password: "secret123", FullName: "Alice"}
	repo.On("Create", mock.Anything, mock.AnythingOfType("*model.User")).
		Return(&model.User{ID: 1, Email: "alice@test.com", FullName: "Alice", Role: "member"}, nil)

	resp, err := svc.Register(context.Background(), req)
	assert.NoError(t, err)
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, "alice@test.com", resp.User.Email)
}

func TestRegister_DuplicateEmail(t *testing.T) {
	repo := new(mockUserRepo)
	svc  := service.NewUserService(repo)

	req := &model.RegisterRequest{Email: "dup@test.com", Password: "secret123", FullName: "Dup"}
	repo.On("Create", mock.Anything, mock.AnythingOfType("*model.User")).
		Return(nil, repository.ErrDuplicate)

	_, err := svc.Register(context.Background(), req)
	assert.ErrorIs(t, err, service.ErrEmailTaken)
}

func TestLogin_Success(t *testing.T) {
	repo := new(mockUserRepo)
	svc  := service.NewUserService(repo)

	// Pre-hash so bcrypt comparison succeeds
	import_hash := "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy" // password: "secret"
	repo.On("FindByEmail", mock.Anything, "bob@test.com").
		Return(&model.User{ID: 2, Email: "bob@test.com", Password: import_hash, Role: "member"}, nil)

	req := &model.LoginRequest{Email: "bob@test.com", Password: "secret"}
	resp, err := svc.Login(context.Background(), req)
	assert.NoError(t, err)
	assert.NotEmpty(t, resp.Token)
}

func TestLogin_InvalidCredentials(t *testing.T) {
	repo := new(mockUserRepo)
	svc  := service.NewUserService(repo)

	repo.On("FindByEmail", mock.Anything, "nobody@test.com").
		Return(nil, repository.ErrNotFound)

	req := &model.LoginRequest{Email: "nobody@test.com", Password: "wrong"}
	_, err := svc.Login(context.Background(), req)
	assert.ErrorIs(t, err, service.ErrInvalidCredentials)
}

func TestGetProfile_NotFound(t *testing.T) {
	repo := new(mockUserRepo)
	svc  := service.NewUserService(repo)

	repo.On("FindByID", mock.Anything, int64(999)).Return(nil, repository.ErrNotFound)

	_, err := svc.GetProfile(context.Background(), 999)
	assert.ErrorIs(t, err, service.ErrUserNotFound)
}

func TestListUsers(t *testing.T) {
	repo := new(mockUserRepo)
	svc  := service.NewUserService(repo)

	expected := []*model.User{{ID: 1, Email: "a@a.com"}, {ID: 2, Email: "b@b.com"}}
	repo.On("List", mock.Anything).Return(expected, nil)

	users, err := svc.ListUsers(context.Background())
	assert.NoError(t, err)
	assert.Len(t, users, 2)
}

func TestUpdateProfile_RepoError(t *testing.T) {
	repo := new(mockUserRepo)
	svc  := service.NewUserService(repo)

	repo.On("Update", mock.Anything, int64(1), mock.Anything).Return(nil, errors.New("db error"))

	_, err := svc.UpdateProfile(context.Background(), 1, &model.UpdateProfileRequest{FullName: "New"})
	assert.Error(t, err)
}
