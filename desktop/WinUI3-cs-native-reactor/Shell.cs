using Microsoft.UI.Xaml;using Microsoft.UI.Xaml.Controls;using Microsoft.UI.Xaml.Automation;using Microsoft.UI.Xaml.Media;
namespace NeutronStar.ReactorBench;
internal static class Shell
{
 public static Window Window{get;set;}=null!;
 public static IEnumerable<DependencyObject> Walk(DependencyObject parent){for(int i=0;i<VisualTreeHelper.GetChildrenCount(parent);i++){var c=VisualTreeHelper.GetChild(parent,i);yield return c;foreach(var n in Walk(c))yield return n;}}
 public static FrameworkElement? Find(string id)=>Walk(Window.Content).OfType<FrameworkElement>().FirstOrDefault(e=>AutomationProperties.GetAutomationId(e)==id);
 public static void Back(){Window.DispatcherQueue.TryEnqueue(()=>{(Find("PageScroll") as ScrollViewer)?.ChangeView(null,0,null,true);(Find("open-workbench") as Control)?.Focus(FocusState.Programmatic);});}
 public static void IntoWorkbench()=>Window.DispatcherQueue.TryEnqueue(()=>Find("workbench")?.StartBringIntoView(new BringIntoViewOptions{AnimationDesired=false}));
 public static void FocusAbout(){EventHandler<object>? next=null;next=(_,_)=>{CompositionTarget.Rendering-=next;(Find("about-trigger") as Control)?.Focus(FocusState.Programmatic);};CompositionTarget.Rendering+=next;}
}
