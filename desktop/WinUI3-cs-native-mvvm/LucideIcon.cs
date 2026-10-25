using Microsoft.UI.Xaml;using Microsoft.UI.Xaml.Controls;using Microsoft.UI.Xaml.Media;using Microsoft.UI.Xaml.Markup;using Windows.UI;
namespace NeutronStar.WinUINative;
public sealed class LucideIcon:UserControl
{
 public static readonly DependencyProperty KindProperty=DependencyProperty.Register(nameof(Kind),typeof(string),typeof(LucideIcon),new PropertyMetadata("orbit",Changed));
 public static readonly DependencyProperty StrokeProperty=DependencyProperty.Register(nameof(Stroke),typeof(Brush),typeof(LucideIcon),new PropertyMetadata(null,Changed));
 public string Kind{get=>(string)GetValue(KindProperty);set=>SetValue(KindProperty,value);}
 public Brush Stroke{get=>(Brush)GetValue(StrokeProperty);set=>SetValue(StrokeProperty,value);}
 public LucideIcon(){Width=16;Height=16;Render();}
 private static void Changed(DependencyObject d,DependencyPropertyChangedEventArgs e)=>((LucideIcon)d).Render();
 private void Render(){var data=Kind switch{
"orbit"=>"M20.341 6.484A10 10 0 0 1 10.266 21.85 M3.659 17.516A10 10 0 0 1 13.74 2.152 M9,12 A3,3 0 1 0 15,12 A3,3 0 1 0 9,12 M17,5 A2,2 0 1 0 21,5 A2,2 0 1 0 17,5 M3,19 A2,2 0 1 0 7,19 A2,2 0 1 0 3,19",
"info"=>"M2,12 A10,10 0 1 0 22,12 A10,10 0 1 0 2,12 M12 16v-4 M12 8h.01",
"shield-check"=>"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12 l2 2 4-4",
"lock-keyhole"=>"M11,16 A1,1 0 1 0 13,16 A1,1 0 1 0 11,16 M5,10 H19 Q21,10 21,12 V20 Q21,22 19,22 H5 Q3,22 3,20 V12 Q3,10 5,10 Z M7 10V7a5 5 0 0 1 10 0v3",
"unlock-keyhole"=>"M11,16 A1,1 0 1 0 13,16 A1,1 0 1 0 11,16 M5,10 H19 Q21,10 21,12 V20 Q21,22 19,22 H5 Q3,22 3,20 V12 Q3,10 5,10 Z M7 10V7a5 5 0 0 1 9.33-2.5",
"arrow-down-to-line"=>"M12 17V3 M6 11 l6 6 6-6 M19 21H5",
"arrow-up-from-line"=>"M18 9 l-6-6-6 6 M12 3v14 M5 21h14",
 _=>throw new ArgumentOutOfRangeException(nameof(Kind))};var canvas=new Canvas{Width=24,Height=24};canvas.Children.Add(new Microsoft.UI.Xaml.Shapes.Path{Data=(Geometry)XamlBindingHelper.ConvertValue(typeof(Geometry),data),Stroke=Stroke??new SolidColorBrush(Color.FromArgb(255,23,26,24)),StrokeThickness=2,StrokeStartLineCap=PenLineCap.Round,StrokeEndLineCap=PenLineCap.Round,StrokeLineJoin=PenLineJoin.Round});Content=new Viewbox{Child=canvas};}
}
