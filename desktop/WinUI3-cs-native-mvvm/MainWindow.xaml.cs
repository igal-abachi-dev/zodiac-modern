using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Automation;
using NeutronStar.WinUINative.Models;
using Windows.Graphics;
namespace NeutronStar.WinUINative;
public sealed partial class MainWindow:Window
{
 public MainModel ViewModel{get;}
 private ContentDialog? dialog;private bool closed;private int readyFrames;
 [DllImport("user32.dll")] private static extern uint GetDpiForWindow(nint hwnd);
 public MainWindow(){ViewModel=new(new DispatcherClock(DispatcherQueue));InitializeComponent();Title="NeutronStar GUI Bench";uint dpi=GetDpiForWindow(WinRT.Interop.WindowNative.GetWindowHandle(this));AppWindow.ResizeClient(new SizeInt32((int)(960*dpi/96),(int)(640*dpi/96)));Root.Loaded+=Loaded;Root.SizeChanged+=(_,_)=>Responsive();ViewModel.PropertyChanged+=ModelChanged;Closed+=(_,_)=>{closed=true;CompositionTarget.Rendering-=Frame;dialog?.Hide();ViewModel.Dispose();};}
 public Visibility Show(bool value)=>value?Visibility.Visible:Visibility.Collapsed;
 private void Loaded(object sender,RoutedEventArgs e){Responsive();CompositionTarget.Rendering+=Frame;}
 private void Frame(object? sender,object e){if(++readyFrames<2)return;CompositionTarget.Rendering-=Frame;if(!closed)ViewModel.Ready();}
 private void ModelChanged(object? sender,PropertyChangedEventArgs e){if(e.PropertyName!=nameof(ViewModel.WorkbenchOpen))return;DispatcherQueue.TryEnqueue(()=>{if(closed)return;if(ViewModel.WorkbenchOpen)WorkbenchSection.StartBringIntoView(new BringIntoViewOptions{AnimationDesired=false});else{PageScroll.ChangeView(null,0,null,true);OpenButton.Focus(FocusState.Programmatic);}});}
 private async void AboutClicked(object sender,RoutedEventArgs e){if(dialog is not null)return;dialog=new ContentDialog{XamlRoot=Root.XamlRoot,RequestedTheme=ElementTheme.Light,Title="About this test",Content=new TextBlock{Text="Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved.",TextWrapping=TextWrapping.Wrap},CloseButtonText="Close",DefaultButton=ContentDialogButton.Close};dialog.Opened+=(_,_)=>{foreach(var button in Descendants(dialog).OfType<Button>())if(button.Content?.ToString()=="Close"){AutomationProperties.SetAutomationId(button,"about-close");button.Focus(FocusState.Programmatic);}};try{await dialog.ShowAsync();}finally{dialog=null;if(!closed)AboutTrigger.Focus(FocusState.Programmatic);}}
 private static IEnumerable<DependencyObject> Descendants(DependencyObject parent){for(int i=0;i<VisualTreeHelper.GetChildrenCount(parent);i++){var child=VisualTreeHelper.GetChild(parent,i);yield return child;foreach(var next in Descendants(child))yield return next;}}
 private void Responsive(){bool narrow=Root.ActualWidth<620;Header.ColumnDefinitions.Clear();Header.RowDefinitions.Clear();Header.ColumnDefinitions.Add(new ColumnDefinition{Width=new GridLength(1,GridUnitType.Star)});if(narrow){Header.RowDefinitions.Add(new RowDefinition{Height=GridLength.Auto});Header.RowDefinitions.Add(new RowDefinition{Height=GridLength.Auto});}else Header.ColumnDefinitions.Add(new ColumnDefinition{Width=GridLength.Auto});Grid.SetColumn(AboutTrigger,narrow?0:1);Grid.SetRow(AboutTrigger,narrow?1:0);AboutTrigger.HorizontalAlignment=HorizontalAlignment.Left;
 Cards.ColumnDefinitions.Clear();Cards.RowDefinitions.Clear();Cards.ColumnDefinitions.Add(new ColumnDefinition{Width=new GridLength(1,GridUnitType.Star)});if(narrow){Cards.RowDefinitions.Add(new RowDefinition{Height=GridLength.Auto});Cards.RowDefinitions.Add(new RowDefinition{Height=GridLength.Auto});}else Cards.ColumnDefinitions.Add(new ColumnDefinition{Width=new GridLength(1,GridUnitType.Star)});Grid.SetColumn(EncryptCard,narrow?0:1);Grid.SetRow(EncryptCard,narrow?1:0);
 Footer.ColumnDefinitions.Clear();Footer.RowDefinitions.Clear();if(narrow){Footer.ColumnDefinitions.Add(new ColumnDefinition{Width=new GridLength(1,GridUnitType.Star)});for(int i=0;i<3;i++)Footer.RowDefinitions.Add(new RowDefinition{Height=GridLength.Auto});}else{Footer.ColumnDefinitions.Add(new ColumnDefinition{Width=GridLength.Auto});Footer.ColumnDefinitions.Add(new ColumnDefinition{Width=new GridLength(1,GridUnitType.Star)});Footer.ColumnDefinitions.Add(new ColumnDefinition{Width=GridLength.Auto});}Grid.SetColumn(Privacy,narrow?0:1);Grid.SetRow(Privacy,narrow?1:0);Grid.SetColumn(Renderer,narrow?0:2);Grid.SetRow(Renderer,narrow?2:0);}
}
