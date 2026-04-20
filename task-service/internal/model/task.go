package model

import "time"

type Priority string
type Status string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
	PriorityUrgent Priority = "urgent"

	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusInReview   Status = "in_review"
	StatusDone       Status = "done"
)

type Task struct {
	ID          int64      `json:"id" db:"id"`
	ProjectID   int64      `json:"project_id" db:"project_id"`
	Title       string     `json:"title" db:"title"`
	Description string     `json:"description" db:"description"`
	Status      Status     `json:"status" db:"status"`
	Priority    Priority   `json:"priority" db:"priority"`
	AssigneeID  *int64     `json:"assignee_id" db:"assignee_id"`
	CreatorID   int64      `json:"creator_id" db:"creator_id"`
	DueDate     *time.Time `json:"due_date" db:"due_date"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

type Comment struct {
	ID        int64     `json:"id" db:"id"`
	TaskID    int64     `json:"task_id" db:"task_id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateTaskRequest struct {
	ProjectID   int64      `json:"project_id" binding:"required"`
	Title       string     `json:"title" binding:"required,min=1,max=500"`
	Description string     `json:"description"`
	Priority    Priority   `json:"priority"`
	AssigneeID  *int64     `json:"assignee_id"`
	DueDate     *time.Time `json:"due_date"`
}

type UpdateTaskRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Status      *Status    `json:"status"`
	Priority    *Priority  `json:"priority"`
	AssigneeID  *int64     `json:"assignee_id"`
	DueDate     *time.Time `json:"due_date"`
}

type CreateCommentRequest struct {
	Content string `json:"content" binding:"required,min=1"`
}

type TaskFilter struct {
	ProjectID  int64
	Status     Status
	AssigneeID *int64
}
