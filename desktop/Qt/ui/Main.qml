import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import NeutronStar
ApplicationWindow {
    id: window
    required property BenchController bench
    width: 960; height: 640; minimumWidth: 360; minimumHeight: 480
    visible: true; title: "NeutronStar GUI Bench"; color: Theme.background
    palette.highlight: Theme.accent
    palette.highlightedText: Theme.onAccent
    property bool narrow: width < 620
    onClosing: bench.close()
    function reveal(item) {
        let ancestor=item
        while(ancestor && ancestor!==content) ancestor=ancestor.parent
        if(ancestor!==content) return
        const p=item.mapToItem(content,0,0)
        if(p.y < page.contentY) page.contentY=p.y
        else if(p.y+item.height > page.contentY+page.height) page.contentY=p.y+item.height-page.height
        page.contentY=Math.max(0,Math.min(page.contentY,page.contentHeight-page.height))
    }
    Flickable {
        id: page; anchors.fill: parent; contentWidth: width; contentHeight: content.height+56
        clip: true; boundsBehavior: Flickable.StopAtBounds
        ScrollBar.vertical: ScrollBar { }
        Column {
            id: content; x: 28; y: 28; width: parent.width-56; spacing: 20
            GridLayout {
                width: parent.width; columns: window.narrow ? 1 : 2; columnSpacing: 16; rowSpacing: 12
                ColumnLayout {
                    Layout.fillWidth: true; spacing: 8
                    RowLayout {
                        Image { source: "qrc:/Icons/orbit.svg"; sourceSize: Qt.size(40,40); Accessible.ignored: true; visible: !Theme.highContrast }
                        BenchLabel { text: "NeutronStar GUI Bench"; font.pixelSize: 24; font.weight: Font.DemiBold; Layout.fillWidth: true }
                    }
                    BenchLabel { text: "A UI-only simulation for comparing desktop frontends."; color: Theme.muted; Layout.fillWidth: true }
                }
                BenchButton { id: aboutTrigger; text: "About this test"; Accessible.id: "about-trigger"; onClicked: about.open() }
            }
            Rectangle {
                width: Math.min(parent.width,disclosure.implicitWidth+18); height: 32
                color: Theme.inset; radius: 6; border.color: Theme.border
                Row { id: disclosure; anchors.centerIn: parent; spacing: 7
                    Image { source: "qrc:/Icons/shield-check.svg"; sourceSize: Qt.size(16,16); Accessible.ignored: true; visible: !Theme.highContrast }
                    BenchLabel { text: "SIMULATION · NO FILES OR CRYPTOGRAPHY."; font.pixelSize: 10 }
                }
            }
            GridLayout {
                width: parent.width; columns: window.narrow ? 1 : 2; columnSpacing: 20; rowSpacing: 20
                Operation { bench: window.bench; Layout.fillWidth: true; Layout.preferredWidth: 1 }
                Operation { bench: window.bench; encrypt: true; Layout.fillWidth: true; Layout.preferredWidth: 1 }
            }
            Card {
                width: parent.width
                contentItem: ColumnLayout { spacing: 16
                    Flow { Layout.fillWidth: true; spacing: 12
                        BenchLabel { text: bench.status; Accessible.id: "status"; topPadding: 8
                            onTextChanged: Accessible.announce(text)
                        }
                        BenchButton { text: "Cancel"; visible: bench.busy; onClicked: bench.cancel() }
                        BenchButton { text: "Reset"; enabled: bench.ready; onClicked: bench.reset() }
                    }
                    ProgressBar { Layout.fillWidth: true; from: 0; to: 100; value: bench.progress; Accessible.name: "Simulation progress" }
                    BenchLabel { text: "Simulation progress  " + bench.progress + "%"; font.pixelSize: 11 }
                }
            }
            GridLayout {
                width: parent.width; columns: window.narrow ? 1 : 3; columnSpacing: 16; rowSpacing: 10
                BenchButton {
                    id: openTrigger; text: "Open workbench"; Accessible.id: "open-workbench"; enabled: bench.ready && !bench.busy
                    onClicked: {bench.openWorkbench();Qt.callLater(()=>{page.contentY=workbench.y+content.y})}
                }
                BenchLabel { text: "Local interface. Synthetic data. Nothing is encrypted or decrypted."; font.pixelSize: 11; Layout.fillWidth: true }
                BenchLabel { text: "CONTROLLED RENDERER · LOCAL STATE"; font.pixelSize: 9; Layout.preferredWidth: 130 }
            }
            Loader {
                id: workbench; width: parent.width; active: bench.workbenchOpen
                sourceComponent: Component { Workbench { bench: window.bench; onBack: {bench.closeWorkbench();page.contentY=0;openTrigger.forceActiveFocus()} } }
            }
        }
    }
    Dialog {
        id: about; parent: Overlay.overlay; modal: true; focus: true; popupType: Popup.Item
        title: "About this test"; width: Math.min(420,window.width-56); anchors.centerIn: parent
        closePolicy: Popup.CloseOnEscape
        onOpened: closeAbout.forceActiveFocus()
        onClosed: aboutTrigger.forceActiveFocus()
        contentItem: BenchLabel { text: "Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved." }
        footer: DialogButtonBox {
            BenchButton { id: closeAbout; text: "Close"; Accessible.id: "about-close"; onClicked: about.close(); KeyNavigation.tab: closeAbout; KeyNavigation.backtab: closeAbout }
        }
    }
}
