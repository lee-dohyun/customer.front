"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Dialog, Logo } from "@posselect/ui";

type AgreementArticle = { title: string; body: string };

// home.posselect.com/terms, /privacy 본문과 동일한 텍스트를 모달용으로 미러링한 것.
// 약관 내용을 고치면 두 곳(store.front, customer.front) 모두 갱신해야 함.
const AGREEMENT_CONTENT: Record<"terms" | "privacy", { title: string; articles: AgreementArticle[] }> = {
  terms: {
    title: "이용약관",
    articles: [
      { title: "제1조 (목적)", body: "이 약관은 (주)포스셀렉트(이하 \"회사\")가 운영하는 PosSelect(이하 \"쇼핑몰\")에서 제공하는 인터넷 관련 서비스(이하 \"서비스\")를 이용함에 있어 회사와 이용자의 권리·의무 및 책임사항, 절차 등 기본적인 사항을 규정함을 목적으로 합니다." },
      { title: "제2조 (정의)", body: "① \"쇼핑몰\"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.\n② \"이용자\"란 쇼핑몰에 접속하여 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.\n③ \"회원\"이란 쇼핑몰에 개인정보를 제공하여 회원등록을 한 자로서, 쇼핑몰의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다." },
      { title: "제3조 (약관의 게시와 개정)", body: "① 회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 쇼핑몰 초기 화면 또는 연결화면을 통해 게시합니다.\n② 회사는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.\n③ 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행 약관과 함께 적용일자 7일 이전부터 적용일자 전일까지 공지합니다. 다만 이용자에게 불리한 내용으로 변경하는 경우에는 최소 30일 이상의 유예기간을 두고 공지합니다." },
      { title: "제4조 (회원가입)", body: "① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.\n② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.\n  1. 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우\n  2. 등록 내용에 허위, 기재누락, 오기가 있는 경우\n  3. 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우" },
      { title: "제5조 (서비스의 제공 및 변경)", body: "① 회사는 다음과 같은 업무를 수행합니다.\n  1. 재화 또는 용역에 대한 정보 제공 및 구매계약의 체결\n  2. 구매계약이 체결된 재화 또는 용역의 배송\n  3. 기타 회사가 정하는 업무\n② 회사는 재화 또는 용역의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화 또는 용역의 내용을 변경할 수 있습니다." },
      { title: "제6조 (서비스 이용시간)", body: "서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간을 원칙으로 합니다. 다만 시스템 정기점검, 증설 및 교체를 위해 회사가 정한 날 또는 시간에는 서비스가 일시 중지될 수 있으며, 이 경우 회사는 사전에 공지합니다." },
      { title: "제7조 (구매신청 및 계약의 성립)", body: "① 이용자는 쇼핑몰상에서 다음 또는 이와 유사한 방법에 의하여 구매를 신청하며, 회사는 이용자가 구매신청을 함에 있어 다음의 각 내용을 알기 쉽게 제공하여야 합니다.\n  1. 재화 등의 검색 및 선택\n  2. 받는 사람의 성명, 주소, 전화번호 등 입력\n  3. 결제방법의 선택\n  4. 이 약관에 대한 동의 및 제3항의 각 내용에 대한 확인\n  5. 재화 등의 구매신청 및 이에 관한 확인 또는 회사의 확인에 대한 동의\n② 회사는 이용자의 구매신청에 대하여 승낙의 의사표시를 하는 것을 원칙으로 하며, 회사가 승낙의 통지를 하는 시점에 계약이 성립한 것으로 봅니다." },
      { title: "제8조 (지급방법)", body: "쇼핑몰에서 구매한 재화 또는 용역에 대한 대금지급방법은 신용카드, 계좌이체, 무통장입금, 간편결제(카카오페이, 네이버페이 등) 등 회사가 제공하는 방법으로 할 수 있습니다." },
      { title: "제9조 (청약철회 및 환불)", body: "① 회사와 재화 등의 구매에 관한 계약을 체결한 이용자는 「전자상거래 등에서의 소비자보호에 관한 법률」 제13조 제2항에 따른 계약내용에 관한 서면을 받은 날(그 서면을 받은 때보다 재화 등의 공급이 늦게 이루어진 경우에는 재화 등을 공급받거나 재화 등의 공급이 시작된 날)부터 7일 이내에는 청약철회를 할 수 있습니다.\n② 이용자는 재화 등을 배송받은 경우 재화 등의 내용이 표시·광고 내용과 다르거나 계약내용과 다르게 이행된 때에는 그 재화 등을 공급받은 날부터 3개월 이내, 그 사실을 알게 된 날 또는 알 수 있었던 날부터 30일 이내에 청약철회를 할 수 있습니다." },
      { title: "제10조 (개인정보보호)", body: "회사는 이용자의 개인정보를 보호하기 위해 관련 법령이 정하는 바를 준수하며, 개인정보의 수집·이용·제공에 관한 사항은 별도로 정한 개인정보처리방침이 적용됩니다." },
      { title: "제11조 (회사의 의무)", body: "회사는 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적·안정적으로 재화·용역을 제공하기 위해 노력합니다. 회사는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보보호를 위한 보안시스템을 갖추어야 합니다." },
      { title: "제12조 (이용자의 의무)", body: "이용자는 다음 행위를 하여서는 안 됩니다.\n  1. 신청 또는 변경 시 허위내용의 등록\n  2. 타인의 정보 도용\n  3. 회사가 게시한 정보의 변경\n  4. 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시\n  5. 회사 기타 제3자의 저작권 등 지적재산권에 대한 침해\n  6. 회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위\n  7. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 쇼핑몰에 공개 또는 게시하는 행위" },
      { title: "제13조 (분쟁해결)", body: "회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위해 고객센터를 설치·운영합니다. 회사와 이용자 간에 발생한 전자상거래 분쟁과 관련하여 이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다." },
      { title: "제14조 (재판권 및 준거법)", body: "회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하며, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다. 회사와 이용자 간에 제기된 전자상거래 소송에는 대한민국 법을 적용합니다." },
    ],
  },
  privacy: {
    title: "개인정보 수집 및 이용 동의",
    articles: [
      { title: "1. 개인정보의 수집 항목 및 수집 방법", body: "회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집합니다.\n  · 회원가입 시(필수): 이메일, 비밀번호, 이름\n  · 주문/배송 시(필수): 수령인 이름, 배송지 주소, 연락처\n  · 결제 시(필수): 결제수단 정보(카드사, 계좌 등 — 카드번호 등 민감정보는 PG사가 처리하며 회사는 저장하지 않습니다)\n  · 서비스 이용 과정에서 자동 생성: IP 주소, 쿠키, 접속 로그, 서비스 이용기록\n수집 방법: 홈페이지 회원가입 및 주문, 고객센터 상담, 이벤트 응모 과정에서 이용자가 직접 입력." },
      { title: "2. 개인정보의 수집 및 이용 목적", body: "회사는 수집한 개인정보를 다음의 목적을 위해 이용합니다.\n  · 회원 식별 및 본인여부 확인, 부정이용 방지\n  · 재화 또는 용역의 공급에 따른 계약이행 및 요금 정산(콘텐츠 제공, 구매·요금 결제, 물품배송)\n  · 신규 서비스 개발 및 마케팅·광고에의 활용(이벤트 정보 및 참여기회 제공, 광고성 정보 제공 — 별도 동의한 경우에 한함)\n  · 민원사무 처리(민원인의 신원 확인, 민원사항 확인, 처리결과 통보)" },
      { title: "3. 개인정보의 보유 및 이용기간", body: "회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계 법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.\n  · 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)\n  · 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)\n  · 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)\n  · 로그인 기록: 3개월 (통신비밀보호법)" },
      { title: "4. 개인정보의 제3자 제공", body: "회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 아래의 경우에는 예외로 합니다.\n  · 이용자가 사전에 동의한 경우\n  · 배송업무 수행을 위해 배송업체에 최소한의 배송정보(수령인 이름, 주소, 연락처)를 제공하는 경우\n  · 법령의 규정에 의거하거나, 수사 목적으로 법령에서 정한 절차와 방법에 따라 수사기관의 요구가 있는 경우" },
      { title: "5. 개인정보 처리의 위탁", body: "회사는 서비스 향상을 위해 아래와 같이 개인정보 처리업무를 외부 전문업체에 위탁하여 운영하고 있습니다.\n  · 결제 처리: PG사(신용카드, 간편결제 등)\n  · 배송 업무: 배송 대행업체\n  · 문자/알림 발송: 알림톡/SMS 발송대행업체\n위탁계약 체결 시 개인정보보호법에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한 등을 계약서 등에 명시하고 관리·감독하고 있습니다." },
      { title: "6. 이용자 및 법정대리인의 권리와 그 행사방법", body: "이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 회원탈퇴를 요청할 수도 있습니다. 개인정보 조회, 수정은 로그인 후 \"마이페이지\"에서, 가입해지(동의철회)는 \"회원탈퇴\" 메뉴를 통해 직접 열람, 정정 또는 탈퇴가 가능합니다. 혹은 개인정보관리책임자에게 서면, 전화 또는 이메일로 연락하시면 지체 없이 조치하겠습니다." },
      { title: "7. 개인정보의 파기절차 및 방법", body: "회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다." },
      { title: "8. 개인정보의 안전성 확보 조치", body: "회사는 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및 물리적 조치를 하고 있습니다.\n  · 비밀번호는 암호화되어 저장 및 관리되고 있어 본인만이 알 수 있으며 개인정보의 확인·변경도 비밀번호를 아는 본인에 의해서만 가능\n  · 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위한 보안시스템 설치 및 접근통제\n  · 개인정보를 처리하는 직원을 최소한으로 지정하고 정기적인 교육 실시" },
      { title: "9. 쿠키(Cookie)의 운영 및 거부", body: "회사는 이용자에게 개인화되고 맞춤화된 서비스를 제공하기 위해 쿠키를 사용합니다. 이용자는 웹브라우저 옵션 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 로그인이 필요한 일부 서비스 이용에 어려움이 있을 수 있습니다." },
      { title: "10. 개인정보보호책임자", body: "회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다.\n  · 개인정보보호책임자: 홍길동\n  · 연락처: 1588-0000 / privacy@posselect.com\n이용자는 회사의 서비스를 이용하시면서 발생한 모든 개인정보보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보보호책임자에게 문의하실 수 있습니다." },
      { title: "11. 개인정보처리방침의 변경", body: "이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 홈페이지 공지사항을 통하여 고지합니다." },
    ],
  },
};

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [openAgreement, setOpenAgreement] = useState<"terms" | "privacy" | null>(null);
  const searchParams = useSearchParams();
  const redirectUri = searchParams.get("redirect_uri") || "/mypage";

  const phonePattern = /^01[0-9]-?\d{3,4}-?\d{4}$/;

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // 번호를 바꾸면 이전 인증은 무효화 — 다른 번호로 다시 인증해야 함
    if (otpSent || otpVerified) {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode("");
    }
  };

  const handleSendOtp = async () => {
    setOtpError("");
    if (!phonePattern.test(phone)) {
      setOtpError("올바른 휴대폰 번호 형식이 아닙니다.");
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      if (res.ok) {
        setOtpSent(true);
      } else if (res.status === 429) {
        setOtpError("인증번호 재발송은 60초 후에 가능합니다.");
      } else {
        setOtpError("인증번호 발송에 실패했습니다.");
      }
    } catch {
      setOtpError("인증번호 발송에 실패했습니다.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    if (!otpCode) {
      setOtpError("인증번호를 입력하세요.");
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, code: otpCode }),
      });
      if (res.ok) {
        setOtpVerified(true);
      } else {
        const body = await res.json().catch(() => null);
        setOtpError(body?.error || "인증번호가 일치하지 않습니다.");
      }
    } catch {
      setOtpError("인증번호 확인에 실패했습니다.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const toggleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  };

  const setRequiredAgreement = (setter: (v: boolean) => void, checked: boolean, other: boolean) => {
    setter(checked);
    setAgreeAll(checked && other && agreeMarketing);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !name) {
      setError("이름, 이메일, 비밀번호를 모두 입력하세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!otpVerified) {
      setError("휴대폰 본인 인증을 완료해주세요.");
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phoneNumber: phone, marketingOptIn: agreeMarketing }),
      });
      if (res.status === 201) {
        setDone(true);
      } else if (res.status === 409) {
        setError("이미 가입된 이메일입니다.");
      } else if (res.status === 400) {
        setOtpVerified(false);
        setOtpSent(false);
        setError("휴대폰 인증이 만료되었습니다. 다시 인증해주세요.");
      } else {
        setError("회원가입 중 오류가 발생했습니다.");
      }
    } catch {
      setError("회원가입 중 오류가 발생했습니다.");
    }
  };

  if (done) {
    const loginUrl = `/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <Logo size={24} />
          </div>
          <h2 style={{ marginBottom: 8 }}>이메일을 확인해주세요</h2>
          <p style={{ color: "var(--color-neutral-700)", fontSize: 14, marginBottom: 24 }}>
            {email}로 인증 메일을 보냈습니다. 메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <a href={loginUrl} className="btn btn-secondary btn-block">
            로그인하러 가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", padding: "40px 0" }}>
      <div style={{ maxWidth: 420, width: "100%", padding: "36px 32px", border: "1px solid var(--color-divider)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={24} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="영문/숫자/특수문자 조합 8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              id="passwordConfirm"
              type="password"
              className="input"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/*
            SMS는 아직 실제 발송사(알리고/네이버클라우드 등) 연동 전이라 auth.api가 mock으로
            처리한다(코드를 서버 로그에만 남기고 검증 로직은 실제로 동작) — payment(mock, 항상
            성공)와 동일한 패턴. 실 발송사 연동 시 auth.api PhoneVerificationService만 교체하면
            되고 이 화면은 변경할 필요 없다.
          */}
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="phone">휴대폰 번호</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="phone"
                type="tel"
                className="input"
                placeholder="010-0000-0000"
                style={{ flex: 1 }}
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={otpVerified}
                required
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSendOtp}
                disabled={otpSending || otpVerified || !phone}
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                {otpVerified ? "인증완료" : otpSent ? "재발송" : otpSending ? "발송중..." : "인증요청"}
              </button>
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="otp">인증번호</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  className="input"
                  placeholder="6자리 숫자"
                  style={{ flex: 1 }}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || !otpCode}
                  style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  {otpVerifying ? "확인중..." : "확인"}
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
            <div style={{ color: "var(--color-success, #1a7f37)", fontSize: 12.5, marginBottom: 12 }}>
              휴대폰 인증이 완료되었습니다.
            </div>
          )}
          {otpError && <div style={{ color: "var(--color-danger)", fontSize: 12.5, marginBottom: 12 }}>{otpError}</div>}

          <div style={{ marginBottom: 8 }} />

          <div
            style={{
              borderTop: "1px solid var(--color-divider)",
              borderBottom: "1px solid var(--color-divider)",
              padding: "14px 0",
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13.5px", fontWeight: 600 }}>
              <input type="checkbox" checked={agreeAll} onChange={(e) => toggleAgreeAll(e.target.checked)} />
              전체 동의
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setRequiredAgreement(setAgreeTerms, e.target.checked, agreePrivacy)}
              />
              (필수) 이용약관 동의
              <button
                type="button"
                onClick={() => setOpenAgreement("terms")}
                style={{ marginLeft: "auto", background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
              >
                보기
              </button>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setRequiredAgreement(setAgreePrivacy, e.target.checked, agreeTerms)}
              />
              (필수) 개인정보 수집 및 이용 동의
              <button
                type="button"
                onClick={() => setOpenAgreement("privacy")}
                style={{ marginLeft: "auto", background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
              >
                보기
              </button>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--color-neutral-700)", paddingLeft: 24 }}>
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(e) => {
                  setAgreeMarketing(e.target.checked);
                  setAgreeAll(agreeTerms && agreePrivacy && e.target.checked);
                }}
              />
              (선택) 마케팅 정보 수신 동의
            </label>
          </div>

          {error && <div style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={!otpVerified}>
            가입하기
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
          이미 계정이 있으신가요?{" "}
          <a href="/login" style={{ color: "var(--color-text)", fontWeight: 600 }}>
            로그인
          </a>
        </div>
      </div>

      {openAgreement && (
        <Dialog
          title={AGREEMENT_CONTENT[openAgreement].title}
          onClose={() => setOpenAgreement(null)}
          maxWidth={640}
          actions={
            <button type="button" onClick={() => setOpenAgreement(null)} className="btn btn-secondary">
              닫기
            </button>
          }
        >
          <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20, paddingRight: 4 }}>
            {AGREEMENT_CONTENT[openAgreement].articles.map((article) => (
              <section key={article.title}>
                <h3 style={{ marginBottom: 6, fontSize: 14 }}>{article.title}</h3>
                <p style={{ whiteSpace: "pre-line" }}>{article.body}</p>
              </section>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
