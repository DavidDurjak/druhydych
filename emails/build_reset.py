# Vyrobí šablónu e-mailu na obnovu hesla vo všetkých 46 jazykoch appky (Go template pre Supabase Auth).
# Jazyk berie z user_metadata.lang; bez jazyka (starší účet) = slovenčina, neznámy jazyk = angličtina.
T = {
 'sk': ('Obnova hesla','Niekto (dúfame, že ty) požiadal o zmenu hesla k účtu GainTrain. Ťukni na tlačidlo a nastav si nové heslo.','Nastaviť nové heslo','Ak si o zmenu nežiadal, tento e-mail ignoruj. Tvoje heslo ostane rovnaké.'),
 'en': ('Reset your password','Someone (hopefully you) asked to change the password for your GainTrain account. Tap the button to set a new password.','Set a new password',"If you didn't ask for this, ignore this e-mail. Your password stays the same."),
 'cs': ('Obnova hesla','Někdo (doufáme, že ty) požádal o změnu hesla k účtu GainTrain. Klepni na tlačítko a nastav si nové heslo.','Nastavit nové heslo','Pokud jsi o změnu nežádal, tento e-mail ignoruj. Tvé heslo zůstane stejné.'),
 'de': ('Passwort zurücksetzen','Jemand (hoffentlich du) möchte das Passwort für dein GainTrain-Konto ändern. Tippe auf den Button und lege ein neues Passwort fest.','Neues Passwort festlegen','Wenn du das nicht angefordert hast, ignoriere diese E-Mail. Dein Passwort bleibt unverändert.'),
 'hu': ('Jelszó visszaállítása','Valaki (reméljük, te) kérte a GainTrain-fiókod jelszavának módosítását. Koppints a gombra, és adj meg új jelszót.','Új jelszó megadása','Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt. A jelszavad nem változik.'),
 'pl': ('Resetowanie hasła','Ktoś (mamy nadzieję, że ty) poprosił o zmianę hasła do konta GainTrain. Stuknij przycisk i ustaw nowe hasło.','Ustaw nowe hasło','Jeśli to nie ty, zignoruj tę wiadomość. Twoje hasło się nie zmieni.'),
 'uk': ('Скидання пароля','Хтось (сподіваємося, що ти) попросив змінити пароль до облікового запису GainTrain. Натисни кнопку та встанови новий пароль.','Встановити новий пароль','Якщо це був не ти, просто проігноруй цей лист. Пароль залишиться без змін.'),
 'es': ('Restablece tu contraseña','Alguien (esperamos que tú) ha pedido cambiar la contraseña de tu cuenta de GainTrain. Toca el botón para crear una nueva.','Crear nueva contraseña','Si no lo has pedido tú, ignora este correo. Tu contraseña seguirá siendo la misma.'),
 'fr': ('Réinitialise ton mot de passe','Quelqu’un (toi, on l’espère) a demandé à changer le mot de passe de ton compte GainTrain. Appuie sur le bouton pour en choisir un nouveau.','Choisir un nouveau mot de passe','Si ce n’est pas toi, ignore cet e-mail. Ton mot de passe ne change pas.'),
 'it': ('Reimposta la password','Qualcuno (speriamo tu) ha chiesto di cambiare la password del tuo account GainTrain. Tocca il pulsante per impostarne una nuova.','Imposta nuova password','Se non sei stato tu, ignora questa e-mail. La tua password resta invariata.'),
 'pt': ('Redefine a tua palavra-passe','Alguém (esperamos que tu) pediu para alterar a palavra-passe da tua conta GainTrain. Toca no botão para definir uma nova.','Definir nova palavra-passe','Se não foste tu, ignora este e-mail. A tua palavra-passe continua igual.'),
 'ro': ('Resetează parola','Cineva (sperăm că tu) a cerut schimbarea parolei contului tău GainTrain. Atinge butonul ca să setezi o parolă nouă.','Setează o parolă nouă','Dacă nu ai cerut tu asta, ignoră acest e-mail. Parola ta rămâne la fel.'),
 'ca': ('Restableix la contrasenya','Algú (esperem que tu) ha demanat canviar la contrasenya del teu compte de GainTrain. Toca el botó per crear-ne una de nova.','Crear una contrasenya nova','Si no ho has demanat tu, ignora aquest correu. La teva contrasenya no canvia.'),
 'hr': ('Ponovno postavljanje lozinke','Netko (nadamo se ti) zatražio je promjenu lozinke za tvoj GainTrain račun. Dodirni gumb i postavi novu lozinku.','Postavi novu lozinku','Ako to nisi ti, zanemari ovaj e-mail. Lozinka ti ostaje ista.'),
 'sl': ('Ponastavitev gesla','Nekdo (upamo, da ti) je zahteval spremembo gesla za tvoj račun GainTrain. Tapni gumb in nastavi novo geslo.','Nastavi novo geslo','Če tega nisi zahteval ti, ta e-mail prezri. Geslo ostane enako.'),
 'sr': ('Resetovanje lozinke','Neko (nadamo se ti) je zatražio promenu lozinke za tvoj GainTrain nalog. Dodirni dugme i postavi novu lozinku.','Postavi novu lozinku','Ako to nisi ti, zanemari ovaj imejl. Lozinka ostaje ista.'),
 'bs': ('Resetovanje lozinke','Neko (nadamo se ti) je zatražio promjenu lozinke za tvoj GainTrain račun. Dodirni dugme i postavi novu lozinku.','Postavi novu lozinku','Ako to nisi ti, zanemari ovaj e-mail. Lozinka ostaje ista.'),
 'mk': ('Ресетирање лозинка','Некој (се надеваме ти) побара промена на лозинката за твојата GainTrain сметка. Допри го копчето и постави нова лозинка.','Постави нова лозинка','Ако не си ти, игнорирај ја оваа порака. Лозинката останува иста.'),
 'sq': ('Rivendos fjalëkalimin','Dikush (shpresojmë ti) kërkoi të ndryshojë fjalëkalimin e llogarisë tënde GainTrain. Prek butonin dhe vendos një fjalëkalim të ri.','Vendos fjalëkalim të ri','Nëse nuk e kërkove ti, injoroje këtë email. Fjalëkalimi yt mbetet i njëjtë.'),
 'bg': ('Нулиране на паролата','Някой (надяваме се ти) поиска смяна на паролата за профила ти в GainTrain. Докосни бутона и задай нова парола.','Задай нова парола','Ако не си бил ти, игнорирай този имейл. Паролата ти остава същата.'),
 'ru': ('Сброс пароля','Кто-то (надеемся, ты) запросил смену пароля для аккаунта GainTrain. Нажми на кнопку и задай новый пароль.','Задать новый пароль','Если это был не ты, просто проигнорируй это письмо. Пароль останется прежним.'),
 'nl': ('Wachtwoord opnieuw instellen','Iemand (hopelijk jij) wil het wachtwoord van je GainTrain-account wijzigen. Tik op de knop om een nieuw wachtwoord in te stellen.','Nieuw wachtwoord instellen','Heb je dit niet aangevraagd? Negeer dan deze e-mail. Je wachtwoord blijft hetzelfde.'),
 'sv': ('Återställ ditt lösenord','Någon (förhoppningsvis du) har bett om att byta lösenord för ditt GainTrain-konto. Tryck på knappen för att välja ett nytt.','Välj nytt lösenord','Om det inte var du kan du ignorera det här mejlet. Ditt lösenord är oförändrat.'),
 'da': ('Nulstil din adgangskode','Nogen (forhåbentlig dig) har bedt om at ændre adgangskoden til din GainTrain-konto. Tryk på knappen for at vælge en ny.','Vælg ny adgangskode','Hvis det ikke var dig, så ignorer denne e-mail. Din adgangskode forbliver den samme.'),
 'no': ('Tilbakestill passordet','Noen (forhåpentligvis du) har bedt om å endre passordet til GainTrain-kontoen din. Trykk på knappen for å velge et nytt.','Velg nytt passord','Hvis det ikke var deg, kan du se bort fra denne e-posten. Passordet ditt er uendret.'),
 'fi': ('Nollaa salasanasi','Joku (toivottavasti sinä) pyysi vaihtamaan GainTrain-tilisi salasanan. Napauta painiketta ja aseta uusi salasana.','Aseta uusi salasana','Jos et pyytänyt tätä, voit ohittaa tämän viestin. Salasanasi pysyy ennallaan.'),
 'tr': ('Şifreni sıfırla','Birisi (umarız sensin) GainTrain hesabının şifresini değiştirmek istedi. Yeni bir şifre belirlemek için düğmeye dokun.','Yeni şifre belirle','Bunu sen istemediysen bu e-postayı görmezden gel. Şifren aynı kalır.'),
 'lt': ('Slaptažodžio atkūrimas','Kažkas (tikimės, kad tu) paprašė pakeisti tavo GainTrain paskyros slaptažodį. Paliesk mygtuką ir nustatyk naują slaptažodį.','Nustatyti naują slaptažodį','Jei to neprašei, nekreipk dėmesio į šį laišką. Slaptažodis lieka toks pat.'),
 'lv': ('Paroles atiestatīšana','Kāds (cerams, tu) pieprasīja mainīt tava GainTrain konta paroli. Pieskaries pogai un iestati jaunu paroli.','Iestatīt jaunu paroli','Ja to nepieprasīji tu, ignorē šo e-pastu. Parole paliek nemainīga.'),
 'et': ('Parooli lähtestamine','Keegi (loodetavasti sina) palus muuta sinu GainTraini konto parooli. Puuduta nuppu ja määra uus parool.','Määra uus parool','Kui see polnud sina, jäta see e-kiri tähelepanuta. Sinu parool jääb samaks.'),
 'el': ('Επαναφορά κωδικού','Κάποιος (ελπίζουμε εσύ) ζήτησε αλλαγή του κωδικού για τον λογαριασμό σου στο GainTrain. Πάτησε το κουμπί για να ορίσεις νέο κωδικό.','Ορισμός νέου κωδικού','Αν δεν το ζήτησες εσύ, αγνόησε αυτό το email. Ο κωδικός σου μένει ίδιος.'),
 'ar': ('إعادة تعيين كلمة المرور','طلب أحدهم (نأمل أنك أنت) تغيير كلمة مرور حسابك في GainTrain. اضغط على الزر لتعيين كلمة مرور جديدة.','تعيين كلمة مرور جديدة','إذا لم تطلب ذلك، تجاهل هذه الرسالة. ستبقى كلمة مرورك كما هي.'),
 'he': ('איפוס סיסמה','מישהו (אנחנו מקווים שאתה) ביקש לשנות את הסיסמה של חשבון GainTrain שלך. הקש על הכפתור כדי להגדיר סיסמה חדשה.','הגדרת סיסמה חדשה','אם לא ביקשת זאת, התעלם מהמייל הזה. הסיסמה שלך נשארת אותו דבר.'),
 'fa': ('بازنشانی رمز عبور','کسی (امیدواریم خودت) درخواست تغییر رمز عبور حساب GainTrain تو را داده است. روی دکمه بزن و رمز جدید بگذار.','تعیین رمز جدید','اگر این درخواست از طرف تو نبوده، این ایمیل را نادیده بگیر. رمز عبورت تغییری نمی‌کند.'),
 'ur': ('پاس ورڈ ری سیٹ کریں','کسی نے (امید ہے تم نے) تمہارے GainTrain اکاؤنٹ کا پاس ورڈ بدلنے کی درخواست کی ہے۔ نیا پاس ورڈ بنانے کے لیے بٹن دباؤ۔','نیا پاس ورڈ بنائیں','اگر یہ تم نے نہیں کیا تو اس ای میل کو نظرانداز کرو۔ تمہارا پاس ورڈ وہی رہے گا۔'),
 'hi': ('पासवर्ड रीसेट करें','किसी ने (उम्मीद है तुमने) तुम्हारे GainTrain अकाउंट का पासवर्ड बदलने का अनुरोध किया है। नया पासवर्ड सेट करने के लिए बटन दबाओ।','नया पासवर्ड सेट करें','अगर यह तुमने नहीं किया, तो इस ईमेल को अनदेखा करो। तुम्हारा पासवर्ड वही रहेगा।'),
 'bn': ('পাসওয়ার্ড রিসেট করো','কেউ (আশা করি তুমি) তোমার GainTrain অ্যাকাউন্টের পাসওয়ার্ড বদলানোর অনুরোধ করেছে। নতুন পাসওয়ার্ড সেট করতে বোতামে ট্যাপ করো।','নতুন পাসওয়ার্ড সেট করো','তুমি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করো। তোমার পাসওয়ার্ড একই থাকবে।'),
 'zh': ('重置密码','有人（希望是你）申请更改你的 GainTrain 账户密码。点按下面的按钮设置新密码。','设置新密码','如果不是你本人操作，请忽略这封邮件。你的密码不会改变。'),
 'ja': ('パスワードの再設定','GainTrain アカウントのパスワード変更がリクエストされました（あなたご自身だといいのですが）。ボタンをタップして新しいパスワードを設定してください。','新しいパスワードを設定','心当たりがない場合は、このメールを無視してください。パスワードは変わりません。'),
 'ko': ('비밀번호 재설정','누군가(당신이길 바라요) GainTrain 계정의 비밀번호 변경을 요청했어요. 버튼을 눌러 새 비밀번호를 설정하세요.','새 비밀번호 설정','요청하지 않았다면 이 이메일은 무시하세요. 비밀번호는 그대로 유지돼요.'),
 'vi': ('Đặt lại mật khẩu','Ai đó (hy vọng là bạn) đã yêu cầu đổi mật khẩu tài khoản GainTrain của bạn. Chạm vào nút để đặt mật khẩu mới.','Đặt mật khẩu mới','Nếu không phải bạn, hãy bỏ qua email này. Mật khẩu của bạn vẫn giữ nguyên.'),
 'th': ('รีเซ็ตรหัสผ่าน','มีคน (หวังว่าจะเป็นคุณ) ขอเปลี่ยนรหัสผ่านบัญชี GainTrain ของคุณ แตะปุ่มเพื่อตั้งรหัสผ่านใหม่','ตั้งรหัสผ่านใหม่','หากคุณไม่ได้ขอ ให้เพิกเฉยต่ออีเมลนี้ รหัสผ่านของคุณจะยังเหมือนเดิม'),
 'id': ('Atur ulang kata sandi','Seseorang (semoga kamu) meminta untuk mengubah kata sandi akun GainTrain kamu. Ketuk tombol untuk membuat kata sandi baru.','Buat kata sandi baru','Kalau bukan kamu yang meminta, abaikan email ini. Kata sandimu tetap sama.'),
 'ms': ('Tetapkan semula kata laluan','Seseorang (harap-harap kamu) meminta untuk menukar kata laluan akaun GainTrain kamu. Ketik butang untuk menetapkan kata laluan baharu.','Tetapkan kata laluan baharu','Jika bukan kamu yang meminta, abaikan e-mel ini. Kata laluan kamu kekal sama.'),
 'tl': ('I-reset ang password','May humiling (sana ikaw) na palitan ang password ng iyong GainTrain account. I-tap ang button para magtakda ng bagong password.','Magtakda ng bagong password','Kung hindi ikaw ang humiling, huwag pansinin ang email na ito. Mananatili ang password mo.'),
 'sw': ('Weka upya nenosiri','Mtu fulani (tunatumai ni wewe) ameomba kubadilisha nenosiri la akaunti yako ya GainTrain. Gusa kitufe uweke nenosiri jipya.','Weka nenosiri jipya','Kama si wewe uliyeomba, puuza barua pepe hii. Nenosiri lako linabaki vilevile.'),
 'is': ('Endurstilltu lykilorðið','Einhver (vonandi þú) bað um að breyta lykilorðinu á GainTrain-reikningnum þínum. Ýttu á hnappinn til að velja nýtt lykilorð.','Velja nýtt lykilorð','Ef þetta varst ekki þú skaltu hunsa þennan tölvupóst. Lykilorðið þitt helst óbreytt.'),
}
RTL = {'ar','he','fa','ur'}
def block(l):
    h,p,b,f = T[l]; d = ' dir="rtl"' if l in RTL else ''
    return f'''<div{d}>
    <h1 style="margin:0 0 12px;font-size:22px">{h}</h1>
    <p style="margin:0 0 24px;line-height:1.55;color:#AEB7C2">{p}</p>
    <a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;background:#7CFFB2;color:#06130C;font-weight:800;text-decoration:none;padding:14px 24px;border-radius:14px">{b}</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#7D8794">{f}</p></div>
'''
langs = [l for l in T if l not in ('sk','en')]
out = ['{{ $l := printf "%v" .Data.lang }}',
 '<div style="margin:0;padding:32px 16px;background:#0B0E12;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;color:#EEF2F6">',
 '  <div style="max-width:480px;margin:0 auto;background:#141A21;border:1px solid #232A33;border-radius:20px;padding:32px 28px">',
 '    <div style="font-size:22px;font-weight:900;font-style:italic;letter-spacing:-0.02em;color:#7CFFB2;margin-bottom:24px">GAIN TRAIN</div>',
 '{{ if or (eq $l "sk") (eq $l "<nil>") (eq $l "") }}', block('sk')]
for l in ['en'] + langs:
    out += [f'{{{{ else if eq $l "{l}" }}}}', block(l)]
out += ['{{ else }}', block('en'), '{{ end }}', '  </div>', '</div>']
open('/home/claude/fw/emails/reset-password.html','w').write('\n'.join(out))
print(len(T), 'jazykov,', len('\n'.join(out)), 'znakov')
