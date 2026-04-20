package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/taskflow/user-service/internal/model"
)

var ErrNotFound = errors.New("user not found")
var ErrDuplicate = errors.New("email already exists")

type UserRepository interface {
	Create(ctx context.Context, u *model.User) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByID(ctx context.Context, id int64) (*model.User, error)
	Update(ctx context.Context, id int64, req *model.UpdateProfileRequest) (*model.User, error)
	List(ctx context.Context) ([]*model.User, error)
}

type postgresRepo struct{ db *sql.DB }

func NewPostgresRepo(db *sql.DB) UserRepository { return &postgresRepo{db: db} }

func (r *postgresRepo) Create(ctx context.Context, u *model.User) (*model.User, error) {
	query := `
		INSERT INTO users (email, password_hash, full_name, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, email, password_hash, full_name, role, avatar_url, created_at, updated_at`
	row := r.db.QueryRowContext(ctx, query, u.Email, u.Password, u.FullName, u.Role)
	created := &model.User{}
	err := row.Scan(&created.ID, &created.Email, &created.Password,
		&created.FullName, &created.Role, &created.AvatarURL,
		&created.CreatedAt, &created.UpdatedAt)
	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"` {
			return nil, ErrDuplicate
		}
		return nil, err
	}
	return created, nil
}

func (r *postgresRepo) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `SELECT id, email, password_hash, full_name, role, avatar_url, created_at, updated_at
	          FROM users WHERE email = $1`
	u := &model.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.Password, &u.FullName,
		&u.Role, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *postgresRepo) FindByID(ctx context.Context, id int64) (*model.User, error) {
	query := `SELECT id, email, password_hash, full_name, role, avatar_url, created_at, updated_at
	          FROM users WHERE id = $1`
	u := &model.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.Password, &u.FullName,
		&u.Role, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *postgresRepo) Update(ctx context.Context, id int64, req *model.UpdateProfileRequest) (*model.User, error) {
	query := `
		UPDATE users SET full_name = COALESCE(NULLIF($1,''), full_name),
		                 avatar_url = COALESCE(NULLIF($2,''), avatar_url),
		                 updated_at = NOW()
		WHERE id = $3
		RETURNING id, email, password_hash, full_name, role, avatar_url, created_at, updated_at`
	u := &model.User{}
	err := r.db.QueryRowContext(ctx, query, req.FullName, req.AvatarURL, id).Scan(
		&u.ID, &u.Email, &u.Password, &u.FullName,
		&u.Role, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return u, err
}

func (r *postgresRepo) List(ctx context.Context) ([]*model.User, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, email, full_name, role, avatar_url, created_at, updated_at FROM users ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []*model.User
	for rows.Next() {
		u := &model.User{}
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Role, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
