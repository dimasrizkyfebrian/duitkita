package infrastructure

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"duitkita-api/config"
	appmw "duitkita-api/middleware"
)

func RegisterGlobalMiddleware(r *gin.Engine, cfg *config.Config, logger zerolog.Logger) {
	r.Use(appmw.Recovery(logger))
	r.Use(appmw.Logging(logger))
	r.Use(appmw.ErrorHandler())
	r.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORS.AllowedOrigins,
		AllowMethods: []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))
}

func AuthRequired(jwtCfg config.JWTConfig) gin.HandlerFunc {
	return appmw.Auth(jwtCfg.AccessSecret, jwtCfg.AccessSecretPrevious)
}
