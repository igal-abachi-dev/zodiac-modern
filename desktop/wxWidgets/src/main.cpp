#include "domain.hpp"
#include <wx/wx.h>
#include <wx/gauge.h>
#include <wx/listctrl.h>
#include <wx/scrolwin.h>
#include <wx/wrapsizer.h>
#include <wx/filename.h>
#include <wx/stdpaths.h>
#include <chrono>
#include <windows.h>

using Clock = std::chrono::steady_clock;
class FontResources final {
    std::vector<std::wstring> paths;
public:
    explicit FontResources(const wxString& root) {
        for (const auto* name : {L"inter-latin-400-normal.ttf", L"inter-latin-500-normal.ttf", L"inter-latin-600-normal.ttf", L"noto-sans-hebrew-hebrew-400-normal.ttf"}) {
            auto path = (root + "/assets/Fonts/" + name).ToStdWstring();
            if (!AddFontResourceExW(path.c_str(), FR_PRIVATE, nullptr)) throw std::runtime_error("Local font missing");
            paths.push_back(std::move(path));
        }
    }
    ~FontResources() { for (const auto& path : paths) RemoveFontResourceExW(path.c_str(), FR_PRIVATE, nullptr); }
};
class Frame final : public wxFrame {
    bench::Workflow workflow;
    bench::Rows model;
    wxTimer operation{this}, burst{this};
    Clock::time_point started{}, burstStarted{};
    unsigned operationToken = 0;
    wxPanel *main = nullptr, *work = nullptr, *cards = nullptr;
    wxScrolledWindow* scroll = nullptr;
    wxBoxSizer* cardSizer = nullptr;
    wxButton *decrypt = nullptr, *encrypt = nullptr, *cancel = nullptr, *open = nullptr, *stop = nullptr;
    wxStaticText *status = nullptr, *summary = nullptr;
    wxGauge* gauge = nullptr;
    wxTextCtrl* query = nullptr;
    wxListCtrl* rows = nullptr;
    bool narrow = false;
    wxStaticText* text(wxWindow* parent, const wxString& value, int points = 11, bool bold = false) {
        auto* label = new wxStaticText(parent, wxID_ANY, value);
        label->SetFont(wxFont(wxFontInfo(points).FaceName("Inter").Bold(bold)));
        label->SetForegroundColour(wxColour(24,24,27));
        return label;
    }
    wxButton* button(wxWindow* parent, const wxString& label, std::function<void()> action) {
        auto* result = new wxButton(parent, wxID_ANY, label);
        result->SetMinSize(FromDIP(wxSize(-1,36)));
        result->Bind(wxEVT_BUTTON, [action](wxCommandEvent&) { action(); });
        return result;
    }
    void refreshOperation() {
        const bool running = workflow.phase == bench::Phase::running;
        decrypt->Enable(!running); encrypt->Enable(!running); open->Enable(!running);
        cancel->Show(running); gauge->SetValue(workflow.progress);
        switch(workflow.phase) {
        case bench::Phase::ready: status->SetLabel("Ready"); break;
        case bench::Phase::running: status->SetLabel("Simulation running…"); break;
        case bench::Phase::success: status->SetLabel("Simulation complete. No file was changed."); break;
        case bench::Phase::canceled: status->SetLabel("Simulation canceled."); break;
        }
        main->Layout();
    }
    void start() {
        if (workflow.phase == bench::Phase::running) return;
        workflow.start(); operationToken = workflow.generation; started = Clock::now();
        operation.Start(100); refreshOperation();
    }
    void stopBurst() { burst.Stop(); if(stop) stop->Disable(); }
    void renderRows() {
        const auto filtered = model.filtered(query->GetValue().ToStdWstring());
        rows->Freeze(); rows->DeleteAllItems();
        for (const auto& row : filtered) rows->InsertItem(rows->GetItemCount(), row.label() + L": " + std::to_wstring(row.value));
        rows->Thaw();
        summary->SetLabel(wxString::Format("%zu rows; tick %d", filtered.size(), model.tick));
    }
    void about(wxWindow* trigger) {
        wxDialog dialog(this, wxID_ANY, "About this test", wxDefaultPosition, FromDIP(wxSize(480,240)), wxDEFAULT_DIALOG_STYLE);
        auto* layout = new wxBoxSizer(wxVERTICAL);
        auto* copy = text(&dialog, "Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved.");
        copy->Wrap(FromDIP(420)); layout->Add(copy,1,wxALL|wxEXPAND,FromDIP(24));
        auto* close = new wxButton(&dialog, wxID_CANCEL, "Close"); close->SetDefault();
        layout->Add(close,0,wxALL|wxALIGN_RIGHT,FromDIP(16)); dialog.SetSizer(layout);
        dialog.CentreOnParent(); close->SetFocus(); dialog.ShowModal(); trigger->SetFocus();
    }
    void buildMain() {
        main = new wxPanel(this);
        scroll = new wxScrolledWindow(main,wxID_ANY,wxDefaultPosition,wxDefaultSize,wxVSCROLL);
        scroll->SetScrollRate(0,FromDIP(12));
        auto* outer = new wxBoxSizer(wxVERTICAL); outer->Add(scroll,1,wxEXPAND); main->SetSizer(outer);
        auto* layout = new wxBoxSizer(wxVERTICAL); scroll->SetSizer(layout);
        layout->Add(text(scroll,"NeutronStar GUI Bench",24,true),0,wxALL,FromDIP(20));
        layout->Add(text(scroll,"A UI-only simulation for comparing desktop frontends."),0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(20));
        layout->Add(text(scroll,"SIMULATION · NO FILES OR CRYPTOGRAPHY.",10,true),0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(20));
        cards = new wxPanel(scroll); cardSizer = new wxBoxSizer(wxHORIZONTAL); cards->SetSizer(cardSizer);
        for (bool enc : {false,true}) {
            auto* card = new wxPanel(cards,wxID_ANY,wxDefaultPosition,wxDefaultSize,wxBORDER_SIMPLE);
            card->SetBackgroundColour(*wxWHITE); auto* box = new wxBoxSizer(wxVERTICAL); card->SetSizer(box);
            box->Add(text(card,enc?"Encrypt":"Decrypt",18,true),0,wxALL,FromDIP(16));
            box->Add(text(card,enc?"Message":"Synthetic input",10,true),0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(16));
            if(enc) {
                auto* input = new wxTextCtrl(card,wxID_ANY,wxString::FromUTF8("Zodiac GUI benchmark — שלום — 🌠"),wxDefaultPosition,FromDIP(wxSize(-1,72)),wxTE_MULTILINE);
                input->SetName("Message"); box->Add(input,0,wxLEFT|wxRIGHT|wxEXPAND,FromDIP(16));
            } else {
                box->Add(text(card,"Synthetic sample: starlight.nsx"),0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(16));
                box->Add(text(card,"No disk file is opened.",10),0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(16));
            }
            auto* action = button(card,enc?"Simulate encryption":"Simulate decryption",[this]{start();});
            if(enc) encrypt=action; else decrypt=action;
            box->Add(action,0,wxALL|wxEXPAND,FromDIP(16)); cardSizer->Add(card,1,wxALL|wxEXPAND,FromDIP(6));
        }
        layout->Add(cards,0,wxLEFT|wxRIGHT|wxEXPAND,FromDIP(14));
        status=text(scroll,"Loading…",11,true);layout->Add(status,0,wxALL,FromDIP(20));
        gauge=new wxGauge(scroll,wxID_ANY,100);layout->Add(gauge,0,wxLEFT|wxRIGHT|wxEXPAND,FromDIP(20));
        auto* actions=new wxWrapSizer(wxHORIZONTAL);
        cancel=button(scroll,"Cancel",[this]{operation.Stop();workflow.cancel();refreshOperation();});
        actions->Add(cancel,0,wxALL,FromDIP(4));
        actions->Add(button(scroll,"Reset",[this]{operation.Stop();workflow.reset();refreshOperation();}),0,wxALL,FromDIP(4));
        open=button(scroll,"Open workbench",[this]{showWork();}); actions->Add(open,0,wxALL,FromDIP(4));
        auto* aboutButton=new wxButton(scroll,wxID_ANY,"About this test");
        aboutButton->Bind(wxEVT_BUTTON,[this,aboutButton](wxCommandEvent&){about(aboutButton);}); actions->Add(aboutButton,0,wxALL,FromDIP(4));
        layout->Add(actions,0,wxALL|wxEXPAND,FromDIP(16)); cancel->Hide();
    }
    void buildWork() {
        work=new wxPanel(this,6000);auto* layout=new wxBoxSizer(wxVERTICAL);work->SetSizer(layout);
        layout->Add(text(work,"List and filter workbench",22,true),0,wxALL,FromDIP(16));
        auto* description=text(work,"Deterministic synthetic rows. No files, network, cryptography or native commands.",10);
        layout->Add(description,0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(16));
        layout->Add(text(work,"Workbench ready",10,true),0,wxLEFT|wxRIGHT,FromDIP(16));
        auto* toolbar=new wxWrapSizer(wxHORIZONTAL);
        auto add=[&](const wxString& name,std::function<void()> fn){toolbar->Add(button(work,name,fn),0,wxALL,FromDIP(3));};
        add("Back to main screen",[this]{stopBurst();work->Hide();main->Show();Layout();open->SetFocus();});
        add("1,000 rows",[this]{stopBurst();model.replace(1000);renderRows();});
        add("10,000 rows",[this]{stopBurst();model.replace(10000);renderRows();});
        add("Reverse",[this]{model.reverse();renderRows();});add("Splice 10",[this]{model.splice();renderRows();});
        add("Update 10%",[this]{model.update();renderRows();});
        for(int hz:{10,30,60}) add(wxString::Format("%d Hz / 2 s",hz),[this,hz]{stopBurst();burstStarted=Clock::now();stop->Enable();burst.Start(std::max(1,1000/hz));});
        stop=button(work,"Stop",[this]{stopBurst();});stop->Disable();toolbar->Add(stop,0,wxALL,FromDIP(3));
        add("Remount workload",[this]{stopBurst();query->ChangeValue("");model.remount();renderRows();});
        layout->Add(toolbar,0,wxALL|wxEXPAND,FromDIP(12));
        layout->Add(text(work,"Filter synthetic rows",10,true),0,wxLEFT|wxRIGHT,FromDIP(16));
        query=new wxTextCtrl(work,wxID_ANY);query->SetName("Filter synthetic rows");
        query->Bind(wxEVT_TEXT,[this](wxCommandEvent&){renderRows();});layout->Add(query,0,wxALL|wxEXPAND,FromDIP(16));
        summary=new wxStaticText(work,6002,"1000 rows; tick 0");layout->Add(summary,0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(16));
        // Normal report mode stores every item; never wxLC_VIRTUAL/owner-data.
        rows=new wxListCtrl(work,6001,wxDefaultPosition,wxDefaultSize,wxLC_REPORT|wxLC_NO_HEADER|wxLC_SINGLE_SEL);
        rows->SetName("Synthetic rows");rows->InsertColumn(0,"Synthetic rows",wxLIST_FORMAT_LEFT,FromDIP(800));
        layout->Add(rows,1,wxLEFT|wxRIGHT|wxBOTTOM|wxEXPAND,FromDIP(16));work->Hide();
    }
    void showWork() { stopBurst();model.remount();query->ChangeValue("");renderRows();main->Hide();work->Show();Layout();query->SetFocus(); }
public:
    Frame():wxFrame(nullptr,wxID_ANY,"NeutronStar GUI Bench") {
        SetFont(wxFont(wxFontInfo(11).FaceName("Inter")));SetBackgroundColour(wxColour(250,250,250));
        SetClientSize(FromDIP(wxSize(960,640)));SetMinClientSize(FromDIP(wxSize(360,480)));
        buildMain();buildWork();auto* layout=new wxBoxSizer(wxVERTICAL);layout->Add(main,1,wxEXPAND);layout->Add(work,1,wxEXPAND);SetSizer(layout);
        Bind(wxEVT_TIMER,[this](wxTimerEvent& e){
            if(e.GetId()==operation.GetId()) {
                workflow.advance(operationToken,std::chrono::duration<double,std::milli>(Clock::now()-started).count());
                if(workflow.phase!=bench::Phase::running) operation.Stop();refreshOperation();
            } else if(e.GetId()==burst.GetId()) {
                if(Clock::now()-burstStarted>=std::chrono::seconds(2)) {stopBurst();return;}
                model.update();renderRows();
            }
        });
        Bind(wxEVT_SIZE,[this](wxSizeEvent& e){
            const bool next=GetClientSize().x<FromDIP(640);
            if(next!=narrow) {narrow=next;cardSizer->SetOrientation(narrow?wxVERTICAL:wxHORIZONTAL);}
            Layout();scroll->FitInside();e.Skip();
        });
        Bind(wxEVT_CLOSE_WINDOW,[this](wxCloseEvent&){operation.Stop();stopBurst();Destroy();});
        Centre();Show();CallAfter([this]{refreshOperation();});
    }
};
class App final:public wxApp {
    std::unique_ptr<FontResources> fonts;
public:
    bool OnInit() override {
        try {
            auto root=wxFileName(wxStandardPaths::Get().GetExecutablePath()).GetPath();
            fonts=std::make_unique<FontResources>(root);new Frame();return true;
        } catch(const std::exception&) {wxMessageBox("Cannot initialize the local NeutronStar UI assets.","NeutronStar startup failed",wxOK|wxICON_ERROR);return false;}
    }
};
wxIMPLEMENT_APP(App);
