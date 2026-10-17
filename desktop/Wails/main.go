package main

import (
	"embed"
	"flag"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend
var frontend embed.FS

func main() {
	profile := flag.String("profile", "", "separate absolute WebView2 profile directory")
	flag.Parse()
	if flag.NArg() != 0 {
		panic("Unknown host argument")
	}
	for _, item := range os.Environ() {
		if strings.HasPrefix(strings.ToUpper(item), "WEBVIEW2_") {
			panic("Remove WEBVIEW2_* overrides")
		}
	}
	if *profile == "" {
		*profile = filepath.Join(os.Getenv("LOCALAPPDATA"), "NeutronStar", "Wails", "Profile")
	}
	if !filepath.IsAbs(*profile) {
		panic("Profile must be absolute")
	}
	assets, err := fs.Sub(frontend, "frontend")
	if err != nil {
		panic(err)
	}
	err = wails.Run(&options.App{
		Title: "NeutronStar GUI Bench", Width: 960, Height: 640,
		MinWidth: 720, MinHeight: 480,
		BackgroundColour:         options.NewRGB(255, 255, 255),
		EnableDefaultContextMenu: false,
		// Preserve SmartScreen: default false otherwise adds a disable switch.
		EnableFraudulentWebsiteDetection: true,
		DragAndDrop:                      &options.DragAndDrop{DisableWebViewDrop: true},
		AssetServer:                      &assetserver.Options{Assets: assets, Middleware: assetPolicy(assets)},
		Windows: &windows.Options{
			WebviewUserDataPath: *profile, Theme: windows.Light, BackdropType: windows.None,
			DisablePinchZoom: true, IsZoomControlEnabled: false, ZoomFactor: 1,
		},
		// No bound Go objects, plugins, menus, sidecars or application calls.
	})
	if err != nil {
		panic("Unable to run Wails host")
	}
}
