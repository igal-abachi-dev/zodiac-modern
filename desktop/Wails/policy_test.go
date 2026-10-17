package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestAssetPolicy(t *testing.T) {
	assets := fstest.MapFS{"index.html": &fstest.MapFile{Data: []byte("test")}}
	handler := assetPolicy(assets)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(200) }))
	for _, tc := range []struct {
		method, url string
		status      int
	}{
		{"GET", "http://wails.localhost/", 200}, {"GET", "http://wails.localhost/missing.js", 404},
		{"POST", "http://wails.localhost/index.html", 403}, {"GET", "http://wails.localhost/not.exe", 403},
		{"GET", "http://wails.localhost/../index.html", 403}, {"GET", "http://wails.localhost/index.html?x=1", 403},
	} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, httptest.NewRequest(tc.method, tc.url, nil))
		if recorder.Code != tc.status || recorder.Header().Get("Content-Security-Policy") != csp {
			t.Fatalf("Policy failed: %s %d", tc.url, recorder.Code)
		}
	}
}
