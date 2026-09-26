// Package docs wires up Swagger UI for local/manual API testing. It is kept
// entirely separate from the handler layer on purpose: the OpenAPI spec in
// openapi.yaml is hand-written and maintained here, not generated from
// annotations scattered across the real handlers.
package docs

import (
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// RegisterRoutes mounts Swagger UI at /swagger/index.html, backed by the
// static openapi.yaml spec served at /openapi.yaml. Call this once from
// router setup - it does not touch any existing route group or handler.
//
// The spec is served outside the /swagger/ prefix on purpose: gin's router
// rejects a static path and a catch-all wildcard sharing the same parent
// segment (e.g. /swagger/doc.yaml next to /swagger/*any).
func RegisterRoutes(r *gin.Engine) {
	r.StaticFile("/openapi.yaml", "./docs/openapi.yaml")
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, ginSwagger.URL("/openapi.yaml")))
}
