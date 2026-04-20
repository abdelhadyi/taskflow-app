package notifier

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type Payload struct {
	UserID        int64  `json:"user_id"`
	Type          string `json:"type"`
	Title         string `json:"title"`
	Body          string `json:"body"`
	ReferenceID   int64  `json:"reference_id,omitempty"`
	ReferenceType string `json:"reference_type,omitempty"`
}

func Send(ctx context.Context, p Payload) {
	url := os.Getenv("NOTIFICATION_SERVICE_URL")
	if url == "" {
		url = "http://notification-service:8004"
	}
	url += "/api/notifications/"

	b, _ := json.Marshal(p)
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		log.Printf("notifier: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-user-id", "0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("notifier: %v", err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("notifier: sent type=%s user=%d status=%d\n", p.Type, p.UserID, resp.StatusCode)
}
