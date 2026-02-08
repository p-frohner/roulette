package ws

import (
	"sync"

	"roulette/internal/game"
)

type Hub struct {
	clients       map[*Client]bool
	clientsByUser map[string]*Client
	broadcastAll  chan []byte
	register      chan *Client
	unregister    chan *Client
	done          chan struct{}
	mu            sync.RWMutex
	gameManager   *game.Manager
}

func NewHub() *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		clientsByUser: make(map[string]*Client),
		broadcastAll:  make(chan []byte, 256),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		done:          make(chan struct{}),
	}
}

// SetGameManager sets the game manager on the hub.
func (h *Hub) SetGameManager(gm *game.Manager) {
	h.gameManager = gm
}

// Register adds a client to the hub.
func (h *Hub) Register(c *Client) {
	h.register <- c
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

// BroadcastToAll sends a message to all connected clients.
func (h *Hub) BroadcastToAll(msg []byte) {
	h.broadcastAll <- msg
}

// SendToUser sends a message to a specific user by their user ID.
func (h *Hub) SendToUser(userID string, msg []byte) {
	h.mu.RLock()
	client, ok := h.clientsByUser[userID]
	h.mu.RUnlock()

	if !ok {
		return
	}

	select {
	case client.Send <- msg:
	default:
		// Client too slow, will be cleaned up
	}
}

// Stop shuts down the hub's Run loop.
func (h *Hub) Stop() {
	close(h.done)
}

func (h *Hub) Run() {
	for {
		select {
		case <-h.done:
			h.mu.Lock()
			for client := range h.clients {
				close(client.Send)
				delete(h.clients, client)
			}
			h.clientsByUser = make(map[string]*Client)
			h.mu.Unlock()
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.clientsByUser[client.UserID] = client
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				delete(h.clientsByUser, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()

		case message := <-h.broadcastAll:
			var slowClients []*Client

			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					slowClients = append(slowClients, client)
				}
			}
			h.mu.RUnlock()

			for _, client := range slowClients {
				h.unregister <- client
			}
		}
	}
}
