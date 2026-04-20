package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/taskflow/task-service/internal/model"
	"github.com/taskflow/task-service/internal/notifier"
	"github.com/taskflow/task-service/internal/repository"
)

var ErrNotFound = errors.New("task not found")

type TaskService interface {
	CreateTask(ctx context.Context, userID int64, req *model.CreateTaskRequest) (*model.Task, error)
	GetTask(ctx context.Context, id int64) (*model.Task, error)
	ListTasks(ctx context.Context, f model.TaskFilter) ([]*model.Task, error)
	UpdateTask(ctx context.Context, id int64, req *model.UpdateTaskRequest) (*model.Task, error)
	DeleteTask(ctx context.Context, id int64) error
	AddComment(ctx context.Context, taskID, userID int64, req *model.CreateCommentRequest) (*model.Comment, error)
	GetComments(ctx context.Context, taskID int64) ([]*model.Comment, error)
}

type taskService struct{ repo repository.TaskRepository }

func NewTaskService(repo repository.TaskRepository) TaskService { return &taskService{repo: repo} }

func (s *taskService) CreateTask(ctx context.Context, userID int64, req *model.CreateTaskRequest) (*model.Task, error) {
	priority := req.Priority
	if priority == "" {
		priority = model.PriorityMedium
	}
	t := &model.Task{
		ProjectID:   req.ProjectID,
		Title:       req.Title,
		Description: req.Description,
		Status:      model.StatusTodo,
		Priority:    priority,
		AssigneeID:  req.AssigneeID,
		CreatorID:   userID,
		DueDate:     req.DueDate,
	}
	created, err := s.repo.Create(ctx, t)
	if err != nil {
		return nil, err
	}
	if created.AssigneeID != nil && *created.AssigneeID != userID {
		go notifier.Send(context.Background(), notifier.Payload{
			UserID: *created.AssigneeID, Type: "task_assigned",
			Title: "New task assigned to you",
			Body:  fmt.Sprintf("You have been assigned to: %s", created.Title),
			ReferenceID: created.ID, ReferenceType: "task",
		})
	}
	return created, nil
}

func (s *taskService) GetTask(ctx context.Context, id int64) (*model.Task, error) {
	t, err := s.repo.FindByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return t, err
}

func (s *taskService) ListTasks(ctx context.Context, f model.TaskFilter) ([]*model.Task, error) {
	return s.repo.List(ctx, f)
}

func (s *taskService) UpdateTask(ctx context.Context, id int64, req *model.UpdateTaskRequest) (*model.Task, error) {
	old, _ := s.repo.FindByID(ctx, id)
	t, err := s.repo.Update(ctx, id, req)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if req.Status != nil && old != nil && old.AssigneeID != nil {
		go notifier.Send(context.Background(), notifier.Payload{
			UserID: *old.AssigneeID, Type: "task_updated",
			Title: "Task status updated",
			Body:  fmt.Sprintf("Task \"%s\" moved to %s", t.Title, *req.Status),
			ReferenceID: t.ID, ReferenceType: "task",
		})
	}
	if req.AssigneeID != nil {
		go notifier.Send(context.Background(), notifier.Payload{
			UserID: *req.AssigneeID, Type: "task_assigned",
			Title: "Task assigned to you",
			Body:  fmt.Sprintf("You have been assigned to: %s", t.Title),
			ReferenceID: t.ID, ReferenceType: "task",
		})
	}
	return t, nil
}

func (s *taskService) DeleteTask(ctx context.Context, id int64) error {
	err := s.repo.Delete(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	return err
}

func (s *taskService) AddComment(ctx context.Context, taskID, userID int64, req *model.CreateCommentRequest) (*model.Comment, error) {
	c := &model.Comment{TaskID: taskID, UserID: userID, Content: req.Content}
	comment, err := s.repo.CreateComment(ctx, c)
	if err != nil {
		return nil, err
	}
	task, _ := s.repo.FindByID(ctx, taskID)
	if task != nil && task.AssigneeID != nil && *task.AssigneeID != userID {
		go notifier.Send(context.Background(), notifier.Payload{
			UserID: *task.AssigneeID, Type: "comment_added",
			Title: "New comment on your task",
			Body:  fmt.Sprintf("New comment on \"%s\"", task.Title),
			ReferenceID: taskID, ReferenceType: "task",
		})
	}
	return comment, nil
}

func (s *taskService) GetComments(ctx context.Context, taskID int64) ([]*model.Comment, error) {
	return s.repo.ListComments(ctx, taskID)
}
