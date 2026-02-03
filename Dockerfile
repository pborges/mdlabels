# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder

WORKDIR /build

# Copy VERSION and CHANGELOG files
COPY VERSION ./
COPY CHANGELOG.md ./public/CHANGELOG.md
COPY mdlabels-ui/package.json mdlabels-ui/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY mdlabels-ui/ ./

# Build the frontend with version from file
RUN export VITE_APP_VERSION=$(cat VERSION) && npm run build

# Stage 2: Build the Go binary
FROM golang:1.21-alpine AS go-builder

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Copy built frontend from previous stage into mdlabels-ui/dist for embedding
COPY --from=frontend-builder /build/dist ./mdlabels-ui/dist

# Build the Go binary with version info
ENV CGO_ENABLED=0
RUN VERSION=$(cat VERSION) && \
    go build -ldflags "-X main.Version=${VERSION} -X main.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" -o mdlabel-web ./cmd/mdlabel-web

# Stage 3: Runtime
FROM alpine:latest

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Create a non-root user
RUN addgroup -g 1000 mdlabels && \
    adduser -D -u 1000 -G mdlabels mdlabels

# Copy the binary from the builder
COPY --from=go-builder /build/mdlabel-web .

# Switch to non-root user
USER mdlabels

# Set port and expose it
ENV PORT=80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-80}/health || exit 1

# Run the application
CMD ["sh", "-c", "./mdlabel-web"]
