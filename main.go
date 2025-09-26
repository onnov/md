package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

const (
	dataDir = "data"
	listen  = "127.0.0.1:8811"
)

// StateRequest represents the JSON body for updating a checkbox state
type StateRequest struct {
	MdID    string `json:"md_id"`
	CheckID string `json:"check_id"`
	State   bool   `json:"state"`
}

// StateResponse represents the JSON body for getting checked checkbox IDs
type StateResponse struct {
	Checked []string `json:"checked"`
}

// GetStatesHandler handles GET requests to /api/states
// It returns a list of checked checkbox IDs for a given md_id
func GetStatesHandler(w http.ResponseWriter, r *http.Request) {
	mdid := r.URL.Query().Get("md_id")
	if mdid == "" {
		http.Error(w, "md_id query parameter is required", http.StatusBadRequest)
		return
	}

	// Construct the directory path for the given md_id
	dirPath := filepath.Join(dataDir, mdid)

	// Read the directory
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		if os.IsNotExist(err) {
			// If the directory doesn't exist, return an empty list
			err = json.NewEncoder(w).Encode(StateResponse{Checked: []string{}})
			if err != nil {
				log.Println(err)
			}
			return
		} else {
			http.Error(w, "Failed to read directory", http.StatusInternalServerError)
			return
		}
	}

	// Collect the names of all files (checked checkboxes)
	var checked []string
	for _, entry := range entries {
		if !entry.IsDir() { // Only consider files
			checked = append(checked, entry.Name())
		}
	}

	// Send the list of checked checkbox IDs as JSON
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(StateResponse{Checked: checked})
	if err != nil {
		log.Println(err)
	}
}

// UpdateStateHandler handles POST and PUT requests to /api/state
// It saves or deletes a file based on the checkbox state
func UpdateStateHandler(w http.ResponseWriter, r *http.Request) {
	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	// Parse the JSON request body
	var req StateRequest
	err = json.Unmarshal(body, &req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.MdID == "" || req.CheckID == "" {
		http.Error(w, "md_id and check_id are required", http.StatusBadRequest)
		return
	}

	// Construct the file path
	filePath := filepath.Join(dataDir, req.MdID, req.CheckID)

	// Create the directory if it doesn't exist
	err = os.MkdirAll(filepath.Dir(filePath), 0755)
	if err != nil {
		http.Error(w, "Failed to create directory", http.StatusInternalServerError)
		return
	}

	// If the state is true, create the file; otherwise, remove it
	if req.State {
		// Create an empty file to mark the checkbox as checked
		file, err := os.Create(filePath)
		if err != nil {
			http.Error(w, "Failed to create file", http.StatusInternalServerError)
			return
		}
		err = file.Close()
		if err != nil {
			log.Println(err)
		}
	} else {
		// Remove the file to mark the checkbox as unchecked
		err = os.Remove(filePath)
		// Ignore errors if the file doesn't exist, as that's the desired state for unchecked
		if err != nil && !os.IsNotExist(err) {
			http.Error(w, "Failed to remove file", http.StatusInternalServerError)
			return
		}
	}

	// Send a success response
	_, err = fmt.Fprint(w, "State updated successfully")
	if err != nil {
		log.Println(err)
	}
}

func main() {
	// Create the root data directory if it doesn't exist
	err := os.MkdirAll(dataDir, 0755)
	if err != nil {
		log.Fatal("Failed to create data directory:", err)
	}

	// Create a new ServeMux
	r := http.NewServeMux()

	// Register the handlers
	r.HandleFunc("/api/states", GetStatesHandler)
	r.HandleFunc("/api/state", UpdateStateHandler)

	// Start the server
	fmt.Println("Server starting on", listen)
	log.Fatal(http.ListenAndServe(listen, r))
}
