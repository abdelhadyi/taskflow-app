package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/taskflow/task-service/internal/handler"
	"github.com/taskflow/task-service/internal/repository"
	"github.com/taskflow/task-service/internal/service"
)

func main() {
	_ = godotenv.Load()

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getenv("DB_HOST", "localhost"), getenv("DB_PORT", "5432"),
		getenv("DB_USER", "taskflow"), getenv("DB_PASSWORD", "taskflow"),
		getenv("DB_NAME", "tasks_db"),
	)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("opening db: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("connecting db: %v", err)
	}
	defer db.Close()

	repo := repository.NewPostgresRepo(db)
	svc  := service.NewTaskService(repo)
	h    := handler.NewTaskHandler(svc)

	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "task-service"})
	})
	api := r.Group("/api/tasks")
	{
		api.POST("/",               h.CreateTask)
		api.GET("/",                h.ListTasks)
		api.GET("/:id",             h.GetTask)
		api.PUT("/:id",             h.UpdateTask)
		api.DELETE("/:id",          h.DeleteTask)
		api.POST("/:id/comments",   h.AddComment)
		api.GET("/:id/comments",    h.GetComments)
	}

	port := getenv("PORT", "8003")
	log.Printf("Task service running on :%s", port)
	r.Run(":" + port)
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
