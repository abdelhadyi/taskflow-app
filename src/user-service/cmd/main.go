package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/taskflow/user-service/internal/handler"
	"github.com/taskflow/user-service/internal/repository"
	"github.com/taskflow/user-service/internal/service"
)

func main() {
	_ = godotenv.Load()

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "taskflow"),
		getEnv("DB_PASSWORD", "taskflow"),
		getEnv("DB_NAME", "users_db"),
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("opening db: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("connecting to db: %v", err)
	}
        defer func() {
		if err := db.Close(); err != nil {
			log.Printf("closing db: %v", err)
		}
	}()


	repo    := repository.NewPostgresRepo(db)
	svc     := service.NewUserService(repo)
	h       := handler.NewUserHandler(svc)

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "user-service"})
	})

	api := r.Group("/api/users")
	{
		api.POST("/register", h.Register)
		api.POST("/login",    h.Login)
		api.GET("/me",        h.GetProfile)
		api.PUT("/me",        h.UpdateProfile)
		api.GET("/",          h.ListUsers)
		api.GET("/:id",       h.GetUserByID)
	}

	port := getEnv("PORT", "8001")
	log.Printf("User service running on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
