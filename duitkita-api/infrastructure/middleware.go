package infrastructure

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"duitkita-api/config"
	appmw "duitkita-api/middleware"
)

// RegisterGlobalMiddleware wires the cross-cutting middleware every request
// goes through, in order: recovery -> logging -> error handling -> CORS.
func RegisterGlobalMiddleware(r *gin.Engine, logger zerolog.Logger) {
	r.Use(appmw.Recovery(logger))
	r.Use(appmw.Logging(logger))
	r.Use(appmw.ErrorHandler())
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Authorization"},
	}))
}

// AuthRequired is a thin re-export so router.go doesn't need to import both
// infrastructure and middleware packages just to protect a route group.
func AuthRequired(jwtCfg config.JWTConfig) gin.HandlerFunc {
	return appmw.Auth(jwtCfg.AccessSecret)
}
