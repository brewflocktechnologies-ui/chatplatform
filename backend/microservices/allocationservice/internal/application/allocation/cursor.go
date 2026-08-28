package allocation

import (
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"time"

	domain "github.com/chatplatform/allocationservice/internal/domain/allocation"
	"github.com/chatplatform/allocationservice/internal/ports"
)

// Cursor tokens are base64url("v1:<created_at unix nanos>:<id>"). Opaque to
// clients, versioned so the format can evolve, and validated on decode so a
// forged or truncated token is a clean InvalidArgument instead of a weird
// empty page.

const cursorPrefix = "v1"

func encodeCursor(c ports.Cursor) string {
	raw := fmt.Sprintf("%s:%d:%s", cursorPrefix, c.CreatedAt.UnixNano(), c.ID)
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeCursor(token string) (ports.Cursor, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return ports.Cursor{}, fmt.Errorf("%w: malformed page token", domain.ErrInvalidArgument)
	}
	parts := strings.SplitN(string(decoded), ":", 3)
	if len(parts) != 3 || parts[0] != cursorPrefix || parts[2] == "" {
		return ports.Cursor{}, fmt.Errorf("%w: malformed page token", domain.ErrInvalidArgument)
	}
	nanos, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return ports.Cursor{}, fmt.Errorf("%w: malformed page token", domain.ErrInvalidArgument)
	}
	return ports.Cursor{
		CreatedAt: time.Unix(0, nanos).UTC(),
		ID:        domain.ID(parts[2]),
	}, nil
}
