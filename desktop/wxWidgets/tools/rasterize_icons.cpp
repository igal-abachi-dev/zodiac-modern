// Build-time conversion of the pinned Lucide SVGs for RNW's native Image view.
#include <wx/wx.h>
#include <wx/bmpbndl.h>
#include <wx/filename.h>
int main(int argc,char** argv) {
    if(argc!=3)return 2;
    wxInitializer init;if(!init)return 3;wxInitAllImageHandlers();
    for(const auto* name:{"orbit","lock-keyhole","unlock-keyhole","shield-check"}) {
        const auto bitmap=wxBitmapBundle::FromSVGFile(wxString::FromUTF8(argv[1])+"/"+name+".svg",wxSize(96,96));
        if(!bitmap.IsOk()||!bitmap.GetBitmap(wxSize(96,96)).ConvertToImage().SaveFile(wxString::FromUTF8(argv[2])+"/"+name+".png",wxBITMAP_TYPE_PNG))return 4;
    }
    return 0;
}
