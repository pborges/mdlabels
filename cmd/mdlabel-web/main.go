package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"sync"
	"time"

	"github.com/pborges/mdlabels"
)

// Version information - set via ldflags at build time
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

// RateLimiter Rate limiter for MusicBrainz API (50 requests per second limit)
type RateLimiter struct {
	mu          sync.Mutex
	lastRequest time.Time
	minInterval time.Duration
}

func NewRateLimiter(minInterval time.Duration) *RateLimiter {
	return &RateLimiter{
		minInterval: minInterval,
	}
}

func (rl *RateLimiter) Wait() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	elapsed := time.Since(rl.lastRequest)
	if elapsed < rl.minInterval {
		time.Sleep(rl.minInterval - elapsed)
	}
	rl.lastRequest = time.Now()
}

var mbRateLimiter = NewRateLimiter(20 * time.Millisecond) // 50 requests per second

// Check if running in development mode
func isDevelopment() bool {
	mode := os.Getenv("MODE")
	return mode == "dev" || mode == "development"
}

// CORS middleware for development
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isDevelopment() {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

// Logging middleware
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf("[%s] %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s - %v", r.Method, r.URL.Path, time.Since(start))
	})
}

// MusicBrainz search proxy
func handleMusicBrainzSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Missing query parameter 'q'", http.StatusBadRequest)
		return
	}

	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "10"
	}

	// Rate limit MusicBrainz API calls
	mbRateLimiter.Wait()

	// Build MusicBrainz API URL
	mbURL := fmt.Sprintf("https://musicbrainz.org/ws/2/release/?query=%s&fmt=json&limit=%s",
		url.QueryEscape(query),
		limit,
	)

	// Create request with User-Agent (MusicBrainz requirement)
	req, err := http.NewRequest("GET", mbURL, nil)
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		log.Printf("Error creating MusicBrainz request: %v", err)
		return
	}

	req.Header.Set("User-Agent", fmt.Sprintf("mdlabels/%s ( https://mdlabels.incursion.dev ; pborges475@gmail.com )", Version))

	// Execute request
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch from MusicBrainz", http.StatusBadGateway)
		log.Printf("Error fetching from MusicBrainz: %v", err)
		return
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("MusicBrainz API error: %d", resp.StatusCode), resp.StatusCode)
		log.Printf("MusicBrainz API returned status: %d", resp.StatusCode)
		return
	}

	// Copy response headers
	w.Header().Set("Content-Type", "application/json")

	// Stream response back to client
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		log.Printf("Error copying MusicBrainz response: %v", err)
	}
}

// Cover Art Archive artwork proxy (single image)
func handleArtwork(w http.ResponseWriter, r *http.Request) {
	// Extract MBID from URL path: /api/artwork/{mbid}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 {
		http.Error(w, "Missing MBID", http.StatusBadRequest)
		return
	}
	mbid := pathParts[2]

	// Fetch from Cover Art Archive
	caaURL := fmt.Sprintf("https://coverartarchive.org/release/%s/front", url.QueryEscape(mbid))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(caaURL)
	if err != nil {
		http.Error(w, "Failed to fetch artwork", http.StatusBadGateway)
		log.Printf("Error fetching artwork for %s: %v", mbid, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		http.Error(w, "Artwork not found", http.StatusNotFound)
		return
	}

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Cover Art Archive error: %d", resp.StatusCode), resp.StatusCode)
		log.Printf("Cover Art Archive returned status %d for %s", resp.StatusCode, mbid)
		return
	}

	// Set caching headers
	w.Header().Set("Cache-Control", "public, max-age=86400") // 24 hours
	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))

	// Stream image back to client
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		log.Printf("Error copying artwork response: %v", err)
	}
}

// Cover Art Archive artwork as base64 data URL
func handleArtworkBase64(w http.ResponseWriter, r *http.Request) {
	// Extract MBID from URL path: /api/artwork/{mbid}/base64
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 {
		http.Error(w, "Missing MBID", http.StatusBadRequest)
		return
	}
	mbid := pathParts[2]

	// Fetch from Cover Art Archive
	caaURL := fmt.Sprintf("https://coverartarchive.org/release/%s/front-500", url.QueryEscape(mbid))

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(caaURL)
	if err != nil {
		http.Error(w, "Failed to fetch artwork", http.StatusBadGateway)
		log.Printf("Error fetching artwork for %s: %v", mbid, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		// Return empty data URL for missing artwork
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"artworkData": ""})
		return
	}

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Cover Art Archive error: %d", resp.StatusCode), resp.StatusCode)
		log.Printf("Cover Art Archive returned status %d for %s", resp.StatusCode, mbid)
		return
	}

	// Read the image data
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read artwork", http.StatusInternalServerError)
		log.Printf("Error reading artwork for %s: %v", mbid, err)
		return
	}

	// Determine content type
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	// Encode as base64 data URL
	base64Data := base64.StdEncoding.EncodeToString(imageData)
	dataURL := fmt.Sprintf("data:%s;base64,%s", contentType, base64Data)

	// Return as JSON
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=86400") // 24 hours
	json.NewEncoder(w).Encode(map[string]string{"artworkData": dataURL})
}

// Cover Art Archive thumbnails/all images proxy
func handleArtworkThumbnails(w http.ResponseWriter, r *http.Request) {
	// Extract MBID from URL path: /api/artwork/{mbid}/thumbnails
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 {
		http.Error(w, "Missing MBID", http.StatusBadRequest)
		return
	}
	mbid := pathParts[2]

	// Fetch metadata from Cover Art Archive
	caaURL := fmt.Sprintf("https://coverartarchive.org/release/%s", url.QueryEscape(mbid))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(caaURL)
	if err != nil {
		http.Error(w, "Failed to fetch artwork metadata", http.StatusBadGateway)
		log.Printf("Error fetching artwork metadata for %s: %v", mbid, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		http.Error(w, "Artwork not found", http.StatusNotFound)
		return
	}

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Cover Art Archive error: %d", resp.StatusCode), resp.StatusCode)
		log.Printf("Cover Art Archive returned status %d for %s", resp.StatusCode, mbid)
		return
	}

	// Set caching headers
	w.Header().Set("Cache-Control", "public, max-age=86400") // 24 hours
	w.Header().Set("Content-Type", "application/json")

	// Stream JSON response back to client
	_, err = io.Copy(w, resp.Body)
	if err != nil {
		log.Printf("Error copying artwork metadata response: %v", err)
	}
}

// API router
func apiHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	switch {
	case path == "/api/search":
		handleMusicBrainzSearch(w, r)
	case path == "/api/version":
		handleVersion(w, r)
	case strings.HasSuffix(path, "/base64"):
		handleArtworkBase64(w, r)
	case strings.HasSuffix(path, "/thumbnails"):
		handleArtworkThumbnails(w, r)
	case strings.HasPrefix(path, "/api/artwork/"):
		handleArtwork(w, r)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// Serve static files or embedded frontend
func serveStatic() http.Handler {
	if isDevelopment() {
		// In development, API only - frontend runs on Vite dev server
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "Frontend runs on http://localhost:5173 in development mode", http.StatusNotFound)
		})
	}

	// Production: serve embedded static files
	staticFS, err := fs.Sub(mdlabels.AssetFS, "mdlabels-ui/dist")
	if err != nil {
		log.Fatalf("Failed to create sub filesystem: %v", err)
	}

	fileServer := http.FileServer(http.FS(staticFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the file
		path := r.URL.Path
		if path == "/" {
			path = "/index.html"
		}

		// Check if file exists
		if _, err := fs.Stat(staticFS, strings.TrimPrefix(path, "/")); err != nil {
			// File not found, serve index.html for SPA routing
			r.URL.Path = "/"
		}

		fileServer.ServeHTTP(w, r)
	})
}

// Health check endpoint
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"mode":    os.Getenv("MODE"),
		"version": Version,
	})
}

// Version info endpoint
func handleVersion(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"version":   Version,
		"buildTime": BuildTime,
		"gitCommit": GitCommit,
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/", apiHandler)

	// Health check
	mux.HandleFunc("/health", handleHealth)

	// Version info
	mux.HandleFunc("/api/version", handleVersion)

	// Static files / SPA
	mux.Handle("/", serveStatic())

	// Apply middleware
	handler := loggingMiddleware(corsMiddleware(mux))

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt)
		<-sigint

		log.Println("Shutting down server...")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Printf("Starting server on port %s (mode: %s)", port, func() string {
		if isDevelopment() {
			return "development"
		}
		return "production"
	}())

	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}

	log.Println("Server stopped")
}
