package main

import("bytes";"context";"os";"path/filepath";"testing";"zodiac-modern/receiver/internal/cli")
func TestPublicValidationBeforePrompt(t *testing.T){
 root:=t.TempDir();bad:=filepath.Join(root,"bad-public.pem");if err:=os.WriteFile(bad,[]byte("invalid synthetic public file"),0600);err!=nil{t.Fatal(err)}
 calls:=0;prompt:=func(context.Context)([]byte,error){calls++;return nil,cli.ErrCanceled}
 for _,test:=range []struct{path string;code int}{{filepath.Join(root,"missing.pem"),5},{bad,2}} {
  if actual:=runWithPrompt([]string{"verify-key","--key","never-opened.pem","--public",test.path},prompt);actual!=test.code{t.Fatalf("wrong public validation category: %d",actual)}
 }
 if calls!=0{t.Fatal("invalid public file requested passphrase")}
 public:="../../tests/fixtures/keys/openssl-3.5-3072-public.pem"
 if code:=runWithPrompt([]string{"verify-key","--key","never-opened.pem","--public",public},prompt);code!=130||calls!=1{t.Fatal("valid public file failed to reach prompt/cancel")}
}
func TestUnlockCategoriesAndPairing(t *testing.T){
 public:="../../tests/fixtures/keys/openssl-3.5-3072-public.pem"
 for _,test:=range []struct{key,password string;code int}{{"openssl-3.5-3072.pem","wrong",3},{"openssl-3.0-3072.pem","Zodiac fixture only — never production",3},{"openssl-3.0-rewrapped-3.5-3072.pem","Zodiac fixture only — never production",2},{"openssl-3.5-3072.pem","Zodiac fixture only — never production",0}} {
  password:=[]byte(test.password);code:=runWithPrompt([]string{"verify-key","--key",filepath.Join("../../tests/fixtures/keys",test.key),"--public",public},func(context.Context)([]byte,error){return password,nil})
  if code!=test.code{t.Fatalf("expected category %d got %d",test.code,code)}
  if !bytes.Equal(password,make([]byte,len(password))){t.Fatal("command retained owned password")}
 }
}
