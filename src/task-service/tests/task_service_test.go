package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/taskflow/task-service/internal/model"
	"github.com/taskflow/task-service/internal/repository"
	"github.com/taskflow/task-service/internal/service"
)

// ── Mock ─────────────────────────────────────────────────────────────────────
type mockRepo struct{ mock.Mock }

func (m *mockRepo) Create(ctx context.Context, t *model.Task) (*model.Task, error) {
	args := m.Called(ctx, t)
	if v := args.Get(0); v != nil { return v.(*model.Task), args.Error(1) }
	return nil, args.Error(1)
}
func (m *mockRepo) FindByID(ctx context.Context, id int64) (*model.Task, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil { return v.(*model.Task), args.Error(1) }
	return nil, args.Error(1)
}
func (m *mockRepo) List(ctx context.Context, f model.TaskFilter) ([]*model.Task, error) {
	args := m.Called(ctx, f)
	if v := args.Get(0); v != nil { return v.([]*model.Task), args.Error(1) }
	return nil, args.Error(1)
}
func (m *mockRepo) Update(ctx context.Context, id int64, req *model.UpdateTaskRequest) (*model.Task, error) {
	args := m.Called(ctx, id, req)
	if v := args.Get(0); v != nil { return v.(*model.Task), args.Error(1) }
	return nil, args.Error(1)
}
func (m *mockRepo) Delete(ctx context.Context, id int64) error {
	return m.Called(ctx, id).Error(0)
}
func (m *mockRepo) CreateComment(ctx context.Context, c *model.Comment) (*model.Comment, error) {
	args := m.Called(ctx, c)
	if v := args.Get(0); v != nil { return v.(*model.Comment), args.Error(1) }
	return nil, args.Error(1)
}
func (m *mockRepo) ListComments(ctx context.Context, taskID int64) ([]*model.Comment, error) {
	args := m.Called(ctx, taskID)
	if v := args.Get(0); v != nil { return v.([]*model.Comment), args.Error(1) }
	return nil, args.Error(1)
}

// ── Tests ─────────────────────────────────────────────────────────────────────
func newTask() *model.Task {
	return &model.Task{ID: 1, ProjectID: 10, Title: "Fix bug", Status: model.StatusTodo,
		Priority: model.PriorityMedium, CreatorID: 42, CreatedAt: time.Now(), UpdatedAt: time.Now()}
}

func TestCreateTask_DefaultPriority(t *testing.T) {
	repo := new(mockRepo)
	svc  := service.NewTaskService(repo)
	req  := &model.CreateTaskRequest{ProjectID: 10, Title: "Fix bug"}
	repo.On("Create", mock.Anything, mock.MatchedBy(func(t *model.Task) bool {
		return t.Priority == model.PriorityMedium
	})).Return(newTask(), nil)
	result, err := svc.CreateTask(context.Background(), 42, req)
	assert.NoError(t, err)
	assert.Equal(t, "Fix bug", result.Title)
}

func TestGetTask_NotFound(t *testing.T) {
	repo := new(mockRepo)
	svc  := service.NewTaskService(repo)
	repo.On("FindByID", mock.Anything, int64(99)).Return(nil, repository.ErrNotFound)
	_, err := svc.GetTask(context.Background(), 99)
	assert.ErrorIs(t, err, service.ErrNotFound)
}

func TestListTasks(t *testing.T) {
	repo := new(mockRepo)
	svc  := service.NewTaskService(repo)
	f    := model.TaskFilter{ProjectID: 10}
	repo.On("List", mock.Anything, f).Return([]*model.Task{newTask(), newTask()}, nil)
	tasks, err := svc.ListTasks(context.Background(), f)
	assert.NoError(t, err)
	assert.Len(t, tasks, 2)
}

func TestUpdateTask_Success(t *testing.T) {
	repo := new(mockRepo)
	svc  := service.NewTaskService(repo)
	done := model.StatusDone
	req  := &model.UpdateTaskRequest{Status: &done}
	updated := newTask(); updated.Status = model.StatusDone
	repo.On("FindByID", mock.Anything, int64(1)).Return(newTask(), nil)
	repo.On("Update", mock.Anything, int64(1), req).Return(updated, nil)
	result, err := svc.UpdateTask(context.Background(), 1, req)
	assert.NoError(t, err)
	assert.Equal(t, model.StatusDone, result.Status)
}

func TestDeleteTask_NotFound(t *testing.T) {
	repo := new(mockRepo)
	svc  := service.NewTaskService(repo)
	repo.On("Delete", mock.Anything, int64(404)).Return(repository.ErrNotFound)
	err := svc.DeleteTask(context.Background(), 404)
	assert.ErrorIs(t, err, service.ErrNotFound)
}

func TestAddComment(t *testing.T) {
	repo := new(mockRepo)
	svc  := service.NewTaskService(repo)
	comment := &model.Comment{ID: 1, TaskID: 1, UserID: 42, Content: "LGTM", CreatedAt: time.Now()}
	repo.On("CreateComment", mock.Anything, mock.AnythingOfType("*model.Comment")).Return(comment, nil)
	repo.On("FindByID", mock.Anything, int64(1)).Return(newTask(), nil)
	result, err := svc.AddComment(context.Background(), 1, 42, &model.CreateCommentRequest{Content: "LGTM"})
	assert.NoError(t, err)
	assert.Equal(t, "LGTM", result.Content)
}

func TestGetComments_RepoError(t *testing.T) {
	repo := new(mockRepo)
	svc  := service.NewTaskService(repo)
	repo.On("ListComments", mock.Anything, int64(1)).Return(nil, errors.New("db error"))
	_, err := svc.GetComments(context.Background(), 1)
	assert.Error(t, err)
}
