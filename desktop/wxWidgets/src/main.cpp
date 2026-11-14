#include "domain.hpp"
#include <wx/wx.h>
#include <wx/gauge.h>
#include <wx/listctrl.h>
#include <wx/scrolwin.h>
#include <wx/wrapsizer.h>
#include <wx/filename.h>
#include <wx/stdpaths.h>
#include <wx/bmpbndl.h>
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
    std::vector<bench::Row> rendered;
    wxTimer operation{this}, burst{this};
    Clock::time_point started{}, burstStarted{};
    unsigned operationToken = 0;
    wxPanel *main = nullptr, *work = nullptr, *cards = nullptr;
    wxScrolledWindow* scroll = nullptr;
    wxBoxSizer *cardSizer = nullptr, *headerSizer = nullptr, *footerSizer = nullptr;
    wxStaticText *headingText = nullptr, *subtitleText = nullptr, *privacyText = nullptr, *rendererText = nullptr, *badgeText = nullptr;
    std::vector<std::pair<wxPanel*,wxStaticText*>> fixtures;
    wxButton *decrypt = nullptr, *encrypt = nullptr, *cancel = nullptr, *open = nullptr, *stop = nullptr;
    wxStaticText *status = nullptr, *summary = nullptr;
    wxGauge* gauge = nullptr;
    wxTextCtrl* query = nullptr;
    wxListCtrl* rows = nullptr;
    bool narrow = false;
    wxBitmapBundle icon(const wxString& name) {
        const auto root=wxFileName(wxStandardPaths::Get().GetExecutablePath()).GetPath();
        return wxBitmapBundle::FromSVGFile(root+"/assets/Icons/"+name+".svg",wxSize(16,16));
    }
    wxStaticText* text(wxWindow* parent, const wxString& value, int pixels = 14, bool bold = false) {
        auto* label = new wxStaticText(parent, wxID_ANY, value);
        label->SetFont(wxFont(wxFontInfo(FromDIP(wxSize(0,pixels))).FaceName("Inter").Bold(bold)));
        label->SetForegroundColour(wxColour(23,26,24));
        return label;
    }
    wxButton* button(wxWindow* parent, const wxString& label, std::function<void()> action) {
        auto* result = new wxButton(parent, wxID_ANY, label);
        result->SetMinSize(FromDIP(wxSize(-1,40)));
        result->SetFont(wxFont(wxFontInfo(FromDIP(wxSize(0,12))).FaceName("Inter")));
        result->SetBackgroundColour(*wxWHITE); result->SetForegroundColour(wxColour(23,26,24));
        result->Bind(wxEVT_BUTTON, [action](wxCommandEvent&) { action(); });
        return result;
    }
    void refreshOperation() {
        const bool running = workflow.phase == bench::Phase::running;
        decrypt->Enable(!running); encrypt->Enable(!running); open->Enable(!running);
        cancel->Show(running); gauge->SetValue(workflow.progress);
        switch(workflow.phase) {
        case bench::Phase::ready: status->SetLabel("Ready"); break;
        case bench::Phase::running: status->SetLabel(L"Simulation running…"); break;
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
    void stopBurst() { burst.Stop(); }
    void renderRows() {
        const auto filtered = model.filtered(query->GetValue().ToStdWstring());
        rows->Freeze();
        const bool sameOrder=filtered.size()==rendered.size()&&std::equal(filtered.begin(),filtered.end(),rendered.begin(),[](const auto& a,const auto& b){return a.id==b.id;});
        if(sameOrder) {
            for(size_t i=0;i<filtered.size();++i) if(filtered[i].value!=rendered[i].value)
                rows->SetItem(static_cast<long>(i),0,filtered[i].label()+L": "+std::to_wstring(filtered[i].value));
        } else {
            rows->DeleteAllItems();
            for (const auto& row : filtered) {const auto item=rows->InsertItem(rows->GetItemCount(), row.label() + L": " + std::to_wstring(row.value));rows->SetItemData(item,static_cast<wxUIntPtr>(row.id));}
        }
        rendered=filtered;
        rows->Thaw();
        summary->SetLabel(wxString::Format("%zu rows; tick %d", filtered.size(), model.tick));
    }
    void about(wxWindow* trigger) {
        wxDialog dialog(this, wxID_ANY, "About this test", wxDefaultPosition, FromDIP(wxSize(480,240)), wxDEFAULT_DIALOG_STYLE);
        auto* layout = new wxBoxSizer(wxVERTICAL);
        auto* copy = text(&dialog, "Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved.");
        copy->Wrap(FromDIP(420)); layout->Add(copy,1,wxALL|wxEXPAND,FromDIP(24));
        auto* close = new wxButton(&dialog, wxID_CANCEL, "Close"); close->SetMinSize(FromDIP(wxSize(-1,40))); close->SetDefault();
        layout->Add(close,0,wxALL|wxEXPAND,FromDIP(24)); dialog.SetSizer(layout);
        dialog.CentreOnParent(); close->SetFocus(); dialog.ShowModal(); trigger->SetFocus();
    }
    void buildMain() {
        main = new wxPanel(this);
        scroll = new wxScrolledWindow(main,wxID_ANY,wxDefaultPosition,wxDefaultSize,wxVSCROLL);
        scroll->SetScrollRate(0,FromDIP(12)); scroll->SetBackgroundColour(wxColour(248,250,249));
        auto* outer = new wxBoxSizer(wxVERTICAL); outer->Add(scroll,1,wxEXPAND); main->SetSizer(outer);
        auto* layout = new wxBoxSizer(wxVERTICAL); scroll->SetSizer(layout);
        auto* header = new wxBoxSizer(wxHORIZONTAL); headerSizer=header;
        auto* brand = new wxBoxSizer(wxVERTICAL);
        auto* heading = new wxBoxSizer(wxHORIZONTAL);
        auto* logo = new wxPanel(scroll,wxID_ANY,wxDefaultPosition,FromDIP(wxSize(40,40)),wxBORDER_SIMPLE);
        logo->SetBackgroundColour(wxColour(241,244,242));
        auto* logoLayout=new wxBoxSizer(wxVERTICAL);logoLayout->AddStretchSpacer();
        logoLayout->Add(new wxStaticBitmap(logo,wxID_ANY,icon("orbit")),0,wxALIGN_CENTER);logoLayout->AddStretchSpacer();logo->SetSizer(logoLayout);
        heading->Add(logo,0,wxRIGHT|wxALIGN_CENTER_VERTICAL,FromDIP(12));
        auto* title=text(scroll,"NeutronStar GUI Bench",24,true);headingText=title;title->SetMinSize(wxSize(1,-1));heading->Add(title,1,wxALIGN_CENTER_VERTICAL);
        brand->Add(heading,0,wxEXPAND);brand->AddSpacer(FromDIP(8));
        auto* subtitle=text(scroll,"A UI-only simulation for comparing desktop frontends.");subtitleText=subtitle;subtitle->SetMinSize(wxSize(1,-1));subtitle->SetForegroundColour(wxColour(93,102,96));
        brand->Add(subtitle,0,wxEXPAND); header->Add(brand,1,wxRIGHT,FromDIP(16));
        auto* aboutButton=button(scroll,"About this test",[]{});
        aboutButton->SetBitmap(icon("info"));aboutButton->Bind(wxEVT_BUTTON,[this,aboutButton](wxCommandEvent&){about(aboutButton);});
        header->Add(aboutButton,0,wxALIGN_TOP);
        layout->Add(header,0,wxALL|wxEXPAND,FromDIP(28));
        auto* badge=new wxPanel(scroll,wxID_ANY,wxDefaultPosition,wxDefaultSize,wxBORDER_SIMPLE);badge->SetBackgroundColour(wxColour(241,244,242));
        auto* badgeLayout=new wxBoxSizer(wxHORIZONTAL);badgeLayout->Add(new wxStaticBitmap(badge,wxID_ANY,icon("shield-check")),0,wxALL|wxALIGN_CENTER_VERTICAL,FromDIP(7));
        badgeText=text(badge,L"SIMULATION \u00b7 NO FILES OR CRYPTOGRAPHY.",10,true);badgeText->SetMinSize(wxSize(1,-1));badgeLayout->Add(badgeText,1,wxTOP|wxBOTTOM|wxRIGHT,FromDIP(7));badge->SetSizer(badgeLayout);
        badge->SetMinSize(FromDIP(wxSize(320,31)));layout->Add(badge,0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(28));
        cards = new wxPanel(scroll); cards->SetBackgroundColour(wxColour(248,250,249));cardSizer = new wxBoxSizer(wxHORIZONTAL); cards->SetSizer(cardSizer);
        for (bool enc : {false,true}) {
            auto* card = new wxPanel(cards,wxID_ANY,wxDefaultPosition,wxDefaultSize,wxBORDER_SIMPLE);
            card->SetBackgroundColour(*wxWHITE);auto* box=new wxBoxSizer(wxVERTICAL);card->SetSizer(box);
            auto* cardTitle=new wxBoxSizer(wxHORIZONTAL);cardTitle->Add(new wxStaticBitmap(card,wxID_ANY,icon(enc?"lock-keyhole":"unlock-keyhole")),0,wxALIGN_CENTER_VERTICAL|wxRIGHT,FromDIP(8));cardTitle->Add(text(card,enc?"Encrypt":"Decrypt",16,true));
            box->Add(cardTitle,0,wxALL,FromDIP(16));
            auto* eyebrow=text(card,"SYNTHETIC INPUT",10,true);eyebrow->SetForegroundColour(wxColour(93,102,96));
            box->Add(eyebrow,0,wxLEFT|wxRIGHT|wxBOTTOM,FromDIP(16));
            auto* fixturePanel=new wxPanel(card,wxID_ANY,wxDefaultPosition,wxDefaultSize,wxBORDER_SIMPLE);fixturePanel->SetBackgroundColour(wxColour(241,244,242));fixturePanel->SetMinSize(FromDIP(wxSize(-1,94)));
            auto* fixtureBox=new wxBoxSizer(wxVERTICAL);fixturePanel->SetSizer(fixtureBox);
            auto* value=text(fixturePanel,enc?wxString::FromUTF8("Zodiac GUI benchmark \xe2\x80\x94 \xd7\xa9\xd7\x9c\xd7\x95\xd7\x9d \xe2\x80\x94 \xf0\x9f\x8c\xa0"):wxString("Synthetic sample: starlight.nsx"));
            value->SetMinSize(wxSize(1,-1)); fixtures.emplace_back(card,value);
            fixtureBox->Add(value,0,wxALL|wxEXPAND,FromDIP(13));
            if(!enc){auto* hint=text(fixturePanel,"No disk file is opened.",12);hint->SetForegroundColour(wxColour(93,102,96));fixtureBox->Add(hint,0,wxLEFT|wxRIGHT,FromDIP(13));}
            box->Add(fixturePanel,0,wxLEFT|wxRIGHT|wxEXPAND,FromDIP(16));
            auto* action=button(card,enc?"Simulate encryption":"Simulate decryption",[this]{start();});
            action->SetFont(wxFont(wxFontInfo(FromDIP(wxSize(0,14))).FaceName("Inter")));
            action->SetBitmap(icon(enc?"arrow-up-from-line-white":"arrow-down-to-line"));
            if(enc){encrypt=action;action->SetBackgroundColour(wxColour(4,120,87));action->SetForegroundColour(*wxWHITE);}else decrypt=action;
            box->Add(action,0,wxALL|wxEXPAND,FromDIP(16));
            if(enc)cardSizer->AddSpacer(FromDIP(20));
            cardSizer->Add(card,1,wxEXPAND);
        }
        layout->Add(cards,0,wxLEFT|wxRIGHT|wxEXPAND,FromDIP(28));layout->AddSpacer(FromDIP(20));
        auto* statusPanel=new wxPanel(scroll,wxID_ANY,wxDefaultPosition,wxDefaultSize,wxBORDER_SIMPLE);statusPanel->SetBackgroundColour(*wxWHITE);
        auto* statusBox=new wxBoxSizer(wxVERTICAL);statusPanel->SetSizer(statusBox);auto* statusRow=new wxBoxSizer(wxHORIZONTAL);
        status=text(statusPanel,"Loading...",13);statusRow->Add(status,1,wxALIGN_CENTER_VERTICAL);
        cancel=button(statusPanel,"Cancel",[this]{operation.Stop();workflow.cancel();refreshOperation();});statusRow->Add(cancel,0,wxRIGHT,FromDIP(8));cancel->Hide();
        statusRow->Add(button(statusPanel,"Reset",[this]{operation.Stop();workflow.reset();refreshOperation();}));statusBox->Add(statusRow,0,wxALL|wxEXPAND,FromDIP(16));
        gauge=new wxGauge(statusPanel,wxID_ANY,100,wxDefaultPosition,FromDIP(wxSize(-1,6)));gauge->SetForegroundColour(wxColour(4,120,87));gauge->SetBackgroundColour(wxColour(241,244,242));statusBox->Add(gauge,0,wxLEFT|wxRIGHT|wxEXPAND,FromDIP(16));
        statusBox->Add(text(statusPanel,"Simulation progress",11),0,wxALL,FromDIP(16));layout->Add(statusPanel,0,wxLEFT|wxRIGHT|wxEXPAND,FromDIP(28));
        auto* footer=new wxBoxSizer(wxHORIZONTAL);footerSizer=footer;open=button(scroll,"Open workbench",[this]{showWork();});footer->Add(open,0,wxRIGHT,FromDIP(12));
        auto* privacy=text(scroll,"Local interface. Synthetic data. Nothing is encrypted or decrypted.",11);privacyText=privacy;privacy->SetMinSize(wxSize(1,-1));privacy->Wrap(FromDIP(340));privacy->SetForegroundColour(wxColour(93,102,96));footer->Add(privacy,1,wxALIGN_CENTER_VERTICAL);
        auto* renderer=text(scroll,L"CONTROLLED RENDERER \u00b7 LOCAL STATE",11);rendererText=renderer;renderer->SetMinSize(wxSize(1,-1));renderer->SetForegroundColour(wxColour(93,102,96));footer->Add(renderer,0,wxLEFT|wxALIGN_CENTER_VERTICAL,FromDIP(12));layout->Add(footer,0,wxALL|wxEXPAND,FromDIP(28));
    }
    void buildWork() {
        work=new wxPanel(this,6000);auto* layout=new wxBoxSizer(wxVERTICAL);work->SetSizer(layout);
        layout->Add(text(work,"List and filter workbench",22,true),0,wxALL,FromDIP(16));
        auto* description=text(work,"Deterministic synthetic rows. No files, network, cryptography or native commands.",14);
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
        stop=button(work,"Stop",[this]{stopBurst();});toolbar->Add(stop,0,wxALL,FromDIP(3));
        add("Remount workload",[this]{stopBurst();query->ChangeValue("");model.remount();renderRows();});
        layout->Add(toolbar,0,wxALL|wxEXPAND,FromDIP(12));
        layout->Add(text(work,"Filter synthetic rows",10,true),0,wxLEFT|wxRIGHT,FromDIP(16));
        query=new wxTextCtrl(work,wxID_ANY);query->SetMinSize(FromDIP(wxSize(-1,40)));query->SetName("Filter synthetic rows");
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
        SetFont(wxFont(wxFontInfo(FromDIP(wxSize(0,14))).FaceName("Inter")));SetBackgroundColour(wxColour(248,250,249));
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
            const bool next=GetClientSize().x<FromDIP(760);
            narrow=next;cardSizer->SetOrientation(narrow?wxVERTICAL:wxHORIZONTAL);
            headerSizer->SetOrientation(narrow?wxVERTICAL:wxHORIZONTAL);
            footerSizer->SetOrientation(narrow?wxVERTICAL:wxHORIZONTAL);
            headerSizer->GetItem(size_t{0})->SetProportion(narrow?0:1);
            headerSizer->GetItem(size_t{0})->SetFlag(wxEXPAND|(narrow?0:wxRIGHT));
            headerSizer->GetItem(size_t{0})->SetBorder(FromDIP(16));
            cardSizer->GetItem(size_t{1})->AssignSpacer(FromDIP(wxSize(narrow?0:20,narrow?20:0)));
            for(auto* item:scroll->GetSizer()->GetChildren())if(item->GetBorder()==FromDIP(28)||item->GetBorder()==FromDIP(20))item->SetBorder(FromDIP(narrow?20:28));
            headerSizer->GetItem(size_t{1})->SetFlag(narrow?wxTOP|wxALIGN_LEFT:wxALIGN_TOP);
            headerSizer->GetItem(size_t{1})->SetBorder(FromDIP(12));
            footerSizer->GetItem(size_t{0})->SetFlag(narrow?wxBOTTOM:wxRIGHT);
            footerSizer->GetItem(size_t{0})->SetBorder(FromDIP(12));
            footerSizer->GetItem(size_t{1})->SetProportion(narrow?0:1);
            footerSizer->GetItem(size_t{1})->SetFlag(narrow?wxBOTTOM|wxEXPAND:wxALIGN_CENTER_VERTICAL);
            footerSizer->GetItem(size_t{1})->SetBorder(FromDIP(12));
            footerSizer->GetItem(size_t{2})->SetFlag(narrow?wxEXPAND:wxLEFT|wxALIGN_CENTER_VERTICAL);
            const int available=std::max(FromDIP(220),GetClientSize().x-FromDIP(76));
            headingText->SetLabel("NeutronStar GUI Bench");headingText->Wrap(std::max(FromDIP(150),available-FromDIP(narrow?52:190)));
            subtitleText->SetLabel("A UI-only simulation for comparing desktop frontends.");subtitleText->Wrap(std::max(FromDIP(150),available-FromDIP(narrow?0:150)));
            privacyText->SetLabel("Local interface. Synthetic data. Nothing is encrypted or decrypted.");privacyText->Wrap(narrow?available:FromDIP(340));
            rendererText->SetLabel(L"CONTROLLED RENDERER \u00b7 LOCAL STATE");rendererText->Wrap(narrow?available:FromDIP(240));
            badgeText->SetLabel(L"SIMULATION \u00b7 NO FILES OR CRYPTOGRAPHY.");badgeText->Wrap(std::max(FromDIP(140),available-FromDIP(40)));
            badgeText->GetParent()->SetMinSize(wxSize(std::min(FromDIP(320),available),-1));
            for(size_t i=0;i<fixtures.size();++i){
                auto* value=fixtures[i].second;
                value->SetLabel(i?wxString::FromUTF8("Zodiac GUI benchmark \xe2\x80\x94 \xd7\xa9\xd7\x9c\xd7\x95\xd7\x9d \xe2\x80\x94 \xf0\x9f\x8c\xa0"):wxString("Synthetic sample: starlight.nsx"));
                value->Wrap(std::max(FromDIP(160),(narrow?available:(available-FromDIP(20))/2)-FromDIP(60)));
            }
            Layout();scroll->SetVirtualSize(scroll->GetClientSize().x,scroll->GetSizer()->CalcMin().y);scroll->Layout();
            const auto viewport=scroll->GetClientSize();const int shellWidth=std::min(viewport.x,FromDIP(1100));
            scroll->GetSizer()->SetDimension((viewport.x-shellWidth)/2,0,shellWidth,scroll->GetSizer()->CalcMin().y);e.Skip();
        });
        scroll->Bind(wxEVT_SIZE,[this](wxSizeEvent& e){e.Skip();CallAfter([this]{const auto v=scroll->GetClientSize();const int w=std::min(v.x,FromDIP(1100));scroll->GetSizer()->SetDimension((v.x-w)/2,0,w,scroll->GetSizer()->CalcMin().y);});});
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
