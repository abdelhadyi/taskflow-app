package service

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/taskflow/user-service/internal/model"
	"github.com/taskflow/user-service/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already taken")
	ErrUserNotFound       = errors.New("user not found")
)

type UserService interface {
	Register(ctx context.Context, req *model.RegisterRequest) (*model.AuthResponse, error)
	Login(ctx context.Context, req *model.LoginRequest) (*model.AuthResponse, error)
	GetProfile(ctx context.Context, id int64) (*model.User, error)
	UpdateProfile(ctx context.Context, id int64, req *model.UpdateProfileRequest) (*model.User, error)
	ListUsers(ctx context.Context) ([]*model.User, error)
}

type userService struct{ repo repository.UserRepository }

func NewUserService(repo repository.UserRepository) UserService { return &userService{repo: repo} }

func (s *userService) Register(ctx context.Context, req *model.RegisterRequest) (*model.AuthResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}
	u := &model.User{Email: req.Email, Password: string(hash), FullName: req.FullName, Role: "member"}
	created, err := s.repo.Create(ctx, u)
	if errors.Is(err, repository.ErrDuplicate) {
		return nil, ErrEmailTaken
	}
	if err != nil {
		return nil, err
	}
	token, err := generateToken(created)
	if err != nil {
		return nil, err
	}
	return &model.AuthResponse{Token: token, User: created}, nil
}

func (s *userService) Login(ctx context.Context, req *model.LoginRequest) (*model.AuthResponse, error) {
	u, err := s.repo.FindByEmail(ctx, req.Email)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password)) != nil {
		return nil, ErrInvalidCredentials
	}
	token, err := generateToken(u)
	if err != nil {
		return nil, err
	}
	return &model.AuthResponse{Token: token, User: u}, nil
}

func (s *userService) GetProfile(ctx context.Context, id int64) (*model.User, error) {
	u, err := s.repo.FindByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrUserNotFound
	}
	return u, err
}

func (s *userService) UpdateProfile(ctx context.Context, id int64, req *model.UpdateProfileRequest) (*model.User, error) {
	u, err := s.repo.Update(ctx, id, req)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrUserNotFound
	}
	return u, err
}

func (s *userService) ListUsers(ctx context.Context) ([]*model.User, error) {
	return s.repo.List(ctx)
}

func generateToken(u *model.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "taskflow-secret-key"
	}
	claims := jwt.MapClaims{
		"userId": u.ID,
		"email":  u.Email,
		"role":   u.Role,
		"exp":    time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
