package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/taskflow/task-service/internal/model"
)

var ErrNotFound = errors.New("not found")

type TaskRepository interface {
	Create(ctx context.Context, t *model.Task) (*model.Task, error)
	FindByID(ctx context.Context, id int64) (*model.Task, error)
	List(ctx context.Context, f model.TaskFilter) ([]*model.Task, error)
	Update(ctx context.Context, id int64, req *model.UpdateTaskRequest) (*model.Task, error)
	Delete(ctx context.Context, id int64) error
	CreateComment(ctx context.Context, c *model.Comment) (*model.Comment, error)
	ListComments(ctx context.Context, taskID int64) ([]*model.Comment, error)
}

type postgresRepo struct{ db *sql.DB }

func NewPostgresRepo(db *sql.DB) TaskRepository { return &postgresRepo{db: db} }

const taskCols = `id, project_id, title, description, status, priority,
                  assignee_id, creator_id, due_date, created_at, updated_at`

func scanTask(row interface{ Scan(...any) error }) (*model.Task, error) {
	t := &model.Task{}
	return t, row.Scan(
		&t.ID, &t.ProjectID, &t.Title, &t.Description,
		&t.Status, &t.Priority, &t.AssigneeID, &t.CreatorID,
		&t.DueDate, &t.CreatedAt, &t.UpdatedAt,
	)
}

func (r *postgresRepo) Create(ctx context.Context, t *model.Task) (*model.Task, error) {
	row := r.db.QueryRowContext(ctx,
		fmt.Sprintf(`INSERT INTO tasks (project_id,title,description,status,priority,assignee_id,creator_id,due_date)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING %s`, taskCols),
		t.ProjectID, t.Title, t.Description, t.Status, t.Priority,
		t.AssigneeID, t.CreatorID, t.DueDate,
	)
	return scanTask(row)
}

func (r *postgresRepo) FindByID(ctx context.Context, id int64) (*model.Task, error) {
	row := r.db.QueryRowContext(ctx,
		fmt.Sprintf(`SELECT %s FROM tasks WHERE id=$1`, taskCols), id)
	t, err := scanTask(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (r *postgresRepo) List(ctx context.Context, f model.TaskFilter) ([]*model.Task, error) {
	conditions := []string{"project_id = $1"}
	args := []any{f.ProjectID}
	idx := 2
	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.AssigneeID != nil {
		conditions = append(conditions, fmt.Sprintf("assignee_id = $%d", idx))
		args = append(args, *f.AssigneeID)
	}
	query := fmt.Sprintf(`SELECT %s FROM tasks WHERE %s ORDER BY created_at DESC`,
		taskCols, strings.Join(conditions, " AND "))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tasks []*model.Task
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

func (r *postgresRepo) Update(ctx context.Context, id int64, req *model.UpdateTaskRequest) (*model.Task, error) {
	setClauses := []string{}
	args := []any{}
	idx := 1

	if req.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title=$%d", idx)); args = append(args, *req.Title); idx++
	}
	if req.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description=$%d", idx)); args = append(args, *req.Description); idx++
	}
	if req.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status=$%d", idx)); args = append(args, *req.Status); idx++
	}
	if req.Priority != nil {
		setClauses = append(setClauses, fmt.Sprintf("priority=$%d", idx)); args = append(args, *req.Priority); idx++
	}
	if req.AssigneeID != nil {
		setClauses = append(setClauses, fmt.Sprintf("assignee_id=$%d", idx)); args = append(args, *req.AssigneeID); idx++
	}
	if req.DueDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("due_date=$%d", idx)); args = append(args, *req.DueDate); idx++
	}
	if len(setClauses) == 0 {
		return r.FindByID(ctx, id)
	}
	setClauses = append(setClauses, "updated_at=NOW()")
	args = append(args, id)
	row := r.db.QueryRowContext(ctx,
		fmt.Sprintf(`UPDATE tasks SET %s WHERE id=$%d RETURNING %s`,
			strings.Join(setClauses, ","), idx, taskCols),
		args...)
	t, err := scanTask(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return t, err
}

func (r *postgresRepo) Delete(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, "DELETE FROM tasks WHERE id=$1", id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *postgresRepo) CreateComment(ctx context.Context, c *model.Comment) (*model.Comment, error) {
	row := r.db.QueryRowContext(ctx,
		`INSERT INTO task_comments (task_id, user_id, content)
		 VALUES ($1,$2,$3)
		 RETURNING id, task_id, user_id, content, created_at`,
		c.TaskID, c.UserID, c.Content,
	)
	out := &model.Comment{}
	err := row.Scan(&out.ID, &out.TaskID, &out.UserID, &out.Content, &out.CreatedAt)
	return out, err
}

func (r *postgresRepo) ListComments(ctx context.Context, taskID int64) ([]*model.Comment, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, task_id, user_id, content, created_at
		 FROM task_comments WHERE task_id=$1 ORDER BY created_at`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var comments []*model.Comment
	for rows.Next() {
		c := &model.Comment{}
		if err := rows.Scan(&c.ID, &c.TaskID, &c.UserID, &c.Content, &c.CreatedAt); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}
