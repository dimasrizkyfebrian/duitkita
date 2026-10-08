package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// In-package rather than under test/unit/ because getEnvAsSlice is
// unexported — and worth pinning, since getting its separator wrong
// surfaces only as a blanket CORS 403 with nothing pointing at the config.
func TestGetEnvAsSlice(t *testing.T) {
	fallback := []string{"fallback"}

	cases := []struct {
		name  string
		value string
		want  []string
	}{
		{"semicolons, as deployed config uses", "http://a;http://b", []string{"http://a", "http://b"}},
		{"commas, as hand-written config tends to use", "http://a,http://b", []string{"http://a", "http://b"}},
		{"both mixed", "http://a;http://b,http://c", []string{"http://a", "http://b", "http://c"}},
		{"surrounding spaces trimmed", " http://a ; http://b ", []string{"http://a", "http://b"}},
		{"empty entries dropped", "http://a;;,http://b", []string{"http://a", "http://b"}},
		{"single value", "http://a", []string{"http://a"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("TEST_SLICE", tc.value)
			require.Equal(t, tc.want, getEnvAsSlice("TEST_SLICE", fallback))
		})
	}

	t.Run("unset falls back", func(t *testing.T) {
		require.Equal(t, fallback, getEnvAsSlice("TEST_SLICE_UNSET", fallback))
	})

	t.Run("empty falls back", func(t *testing.T) {
		t.Setenv("TEST_SLICE", "")
		require.Equal(t, fallback, getEnvAsSlice("TEST_SLICE", fallback))
	})
}
