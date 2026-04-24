// Handlebars şablon metinleri. AI asistan bu şablonları doldurmak için
// değişkenleri (dava/müvekkil verisi) parametre olarak alır ve çıktı üretir.

export const IHTARNAME = `İHTARNAME

İHTAR EDEN    : {{upper client.fullName}}
                {{client.address}}

MUHATAP       : {{upper counterparty.fullName}}
                {{counterparty.address}}

KONU          : {{subject}}

İhtar Tarihi  : {{trDate issuedAt}}

Sayın Muhatap,

Müvekkilim {{client.fullName}} adına, aşağıda izah edilen hususların dikkatinize
sunulması ve gereğinin ifası için işbu ihtarname gönderilmektedir.

{{body}}

Yukarıda izah edilen nedenlerle, işbu ihtarnamenin tarafınıza tebliği tarihinden
itibaren ({{deadlineDays}}) gün içerisinde gereğinin yerine getirilmesini, aksi
halde her türlü yasal hakkımızı kullanmak üzere yargı yoluna başvurulacağını
ihtaren bildiririm.

Saygılarımla,

{{lawyer.fullName}}
Avukat
{{firm.name}} – {{firm.address}}
`;

export const DILEKCE_CEVAP = `{{upper case.court}} SAYIN HAKİMLİĞİNE

DOSYA NO      : {{case.esasNo}}
CEVAP VEREN   : {{client.fullName}} (T.C. Kimlik: {{client.tckn}})
                {{client.address}}

VEKİLİ        : Av. {{lawyer.fullName}} – {{firm.name}}
                {{firm.address}}

DAVACI        : {{case.counterparty}}

KONU          : Cevap dilekçemizin sunulmasıdır.

AÇIKLAMALAR   :

{{body}}

HUKUKİ NEDENLER : HMK, TBK ve sair ilgili mevzuat.

DELİLLER        : {{#each evidences}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

SONUÇ VE TALEP  : Yukarıda izah edilen nedenlerle müvekkilin haklı cevap ve
itirazlarının kabulüne, davanın reddine, yargılama giderleri ve vekalet
ücretinin karşı tarafa yükletilmesine karar verilmesini saygıyla arz ve talep
ederiz. {{trDate issuedAt}}

Vekili
Av. {{lawyer.fullName}}
`;

export const SOZLESME_HUKUKI_DANISMANLIK = `HUKUKİ DANIŞMANLIK SÖZLEŞMESİ

Taraflar arasında aşağıdaki şartlarda iş bu sözleşme akdedilmiştir.

1. TARAFLAR
   Danışman : {{firm.name}} ({{firm.taxId}})
   Müvekkil : {{client.fullName}} ({{#if client.tckn}}T.C.: {{client.tckn}}{{/if}}{{#if client.taxId}}VKN: {{client.taxId}}{{/if}})

2. KONU
{{subject}}

3. ÜCRET
Aylık hukuki danışmanlık ücreti {{fee}} TL + KDV olup her ayın ilk 5 iş günü
içerisinde ödenir.

4. SÜRE
Sözleşme {{trDate startAt}} tarihinden itibaren {{termMonths}} ay süre ile
geçerlidir. Taraflardan herhangi biri fesih bildirimini sözleşme süresinin
bitiminden en az 30 gün önce yazılı olarak bildirmedikçe aynı şartlarda
kendiliğinden yenilenir.

5. GİZLİLİK VE KVKK
Danışman, iş kapsamında edindiği tüm bilgileri gizli tutmayı, 6698 sayılı
KVKK'ya uygun şekilde işlemeyi taahhüt eder.

İşbu sözleşme {{trDate issuedAt}} tarihinde iki nüsha olarak imzalanmıştır.

Danışman                          Müvekkil
{{firm.name}}                     {{client.fullName}}
`;

export const KVKK_AYDINLATMA = `KİŞİSEL VERİLERİN KORUNMASI KANUNU KAPSAMINDA
AYDINLATMA METNİ

Veri Sorumlusu : {{firm.name}}
Adres          : {{firm.address}}
VKN            : {{firm.taxId}}

6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, sizlerle
paylaştığımız aşağıdaki hususlara ilişkin aydınlatma yükümlülüğümüzü yerine
getirmek isteriz.

1. İşlenen Kişisel Veriler
Kimlik bilgileri (ad, soyad, T.C. kimlik numarası), iletişim bilgileri (telefon,
e-posta, adres), dava / dosya bilgileri, finansal bilgiler (fatura, ödeme
kayıtları).

2. İşleme Amaçları
a) Avukatlık hizmetlerinin yürütülmesi,
b) Vekalet görevinin ifası,
c) Yasal yükümlülüklerin yerine getirilmesi (vergi, SGK, meslek kuralları),
d) Müvekkille iletişim ve bilgilendirme.

3. Hukuki Sebepler
KVKK m.5/2-a (kanunlarda açıkça öngörülmesi), m.5/2-c (sözleşmenin kurulması ve
ifası), m.5/2-ç (hukuki yükümlülük), m.5/2-f (meşru menfaat).

4. Aktarım
Kişisel veriler; mahkeme, icra daireleri, UYAP, resmi kurumlar ve hizmet
aldığımız bulut/yazılım tedarikçileri ile yalnızca zorunlu olduğu ölçüde
paylaşılır.

5. Haklarınız (KVKK m.11)
Veri sorumlusuna başvurarak verilerinizin işlenip işlenmediğini öğrenme,
düzeltilmesini veya silinmesini isteme, aktarıldığı üçüncü kişileri öğrenme
haklarına sahipsiniz. Başvurularınız: {{firm.email}}

Yürürlük tarihi: {{trDate effectiveDate}}
`;

export const KVKK_ACIK_RIZA = `AÇIK RIZA BEYANI

{{firm.name}} tarafından, {{trDate effectiveDate}} tarihli Aydınlatma Metni'nde
belirtilen kapsamda kişisel verilerimin, vekalet ilişkisi ve avukatlık
hizmetlerinin yürütülmesi amacıyla işlenmesine, gerektiğinde mahkemeler, resmi
kurumlar ve hizmet aldığınız bulut/yazılım tedarikçilerine aktarılmasına açık
rızamla onay veriyorum.

Ad Soyad : {{client.fullName}}
T.C. No  : {{client.tckn}}
Tarih    : {{trDate issuedAt}}
İmza     : ..........................
`;

export const KVKK_SAKLAMA_IMHA = `{{firm.name}} KİŞİSEL VERİ
SAKLAMA VE İMHA POLİTİKASI

Yürürlük tarihi: {{trDate effectiveDate}}
Revizyon       : v{{version}}

1. Amaç
Bu politika, {{firm.name}} tarafından 6698 sayılı KVKK kapsamında işlenen
kişisel verilerin saklanması ve imhasına ilişkin usul ve esasları düzenler.

2. Saklama Süreleri
- Müvekkil kimlik ve iletişim verileri: vekalet sonrası 10 yıl
- Dava dosyası içeriği: avukatlık kanunu uyarınca 10 yıl
- Finansal kayıtlar (fatura, tahsilat): vergi mevzuatı uyarınca 5 yıl

3. İmha Yöntemleri
- Elektronik veriler: geri dönüşsüz silme (secure erase) + audit log
- Fiziksel evrak: kağıt kıyıcı ile imha, tutanak

4. Periyodik İmha
Her yıl Mart ayında periyodik imha gerçekleştirilir, AuditLog'a kayıt düşülür.

5. Sorumlu
İrtibat: {{firm.dpoName}} ({{firm.dpoEmail}})
`;
