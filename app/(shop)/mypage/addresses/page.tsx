"use client";

import { useEffect, useState } from "react";
import { BlueprintCorners, Dialog, Tag } from "@posselect/ui";

type Address = {
  id: number;
  label: string | null;
  recipientName: string;
  phoneNumber: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
};

type FormState = {
  label: string;
  recipientName: string;
  phoneNumber: string;
  zipCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
};

const emptyForm: FormState = {
  label: "",
  recipientName: "",
  phoneNumber: "",
  zipCode: "",
  address1: "",
  address2: "",
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const load = () => {
    fetch("/api/auth/addresses", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data: Address[]) => setAddresses(data))
      .catch(() => setError("배송지 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreateForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (address: Address) => {
    setEditing(address);
    setForm({
      label: address.label ?? "",
      recipientName: address.recipientName,
      phoneNumber: address.phoneNumber,
      zipCode: address.zipCode,
      address1: address.address1,
      address2: address.address2 ?? "",
      isDefault: address.isDefault,
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientName || !form.phoneNumber || !form.zipCode || !form.address1) {
      setFormError("받는 사람, 연락처, 우편번호, 주소는 필수입니다.");
      return;
    }
    setFormError("");

    const body = {
      label: form.label || null,
      recipientName: form.recipientName,
      phoneNumber: form.phoneNumber,
      zipCode: form.zipCode,
      address1: form.address1,
      address2: form.address2 || null,
      ...(editing ? {} : { isDefault: form.isDefault }),
    };

    const res = await fetch(
      editing ? `/api/auth/addresses/${editing.id}` : "/api/auth/addresses",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      }
    );

    if (res.ok) {
      setShowForm(false);
      load();
    } else {
      setFormError("배송지 저장에 실패했습니다.");
    }
  };

  const handleDelete = async (address: Address) => {
    if (!confirm("이 배송지를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/auth/addresses/${address.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      load();
    } else {
      setError("배송지 삭제에 실패했습니다.");
    }
  };

  const handleSetDefault = async (address: Address) => {
    const res = await fetch(`/api/auth/addresses/${address.id}/default`, {
      method: "PUT",
      credentials: "include",
    });
    if (res.ok) {
      load();
    } else {
      setError("기본 배송지 설정에 실패했습니다.");
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "80px auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>배송지 관리</h2>
        <button onClick={openCreateForm} className="btn btn-primary blueprint">
          <BlueprintCorners />
          새 배송지 추가
        </button>
      </div>

      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && addresses.length === 0 && !error && (
        <p className="text-muted">등록된 배송지가 없습니다.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {addresses.map((address) => (
          <li key={address.id} className="card blueprint elev-sm" style={{ padding: 16 }}>
            <BlueprintCorners />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <strong>{address.label || "배송지"}</strong>
                  {address.isDefault && <Tag variant="success">기본배송지</Tag>}
                </div>
                <p style={{ margin: 0 }}>
                  {address.recipientName} · {address.phoneNumber}
                </p>
                <p className="text-muted" style={{ margin: 0 }}>
                  ({address.zipCode}) {address.address1} {address.address2}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                {!address.isDefault && (
                  <button onClick={() => handleSetDefault(address)} className="btn btn-ghost">
                    기본으로 설정
                  </button>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEditForm(address)} className="btn btn-secondary">
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(address)}
                    className="btn btn-ghost"
                    style={{ color: "var(--color-danger)" }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showForm && (
        <Dialog
          title={editing ? "배송지 수정" : "새 배송지 추가"}
          onClose={closeForm}
          actions={
            <>
              <button onClick={closeForm} className="btn btn-ghost">
                취소
              </button>
              <button type="submit" form="address-form" className="btn btn-primary blueprint">
                <BlueprintCorners />
                저장
              </button>
            </>
          }
        >
          <form id="address-form" onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="label">배송지 이름 (선택)</label>
              <input
                id="label"
                type="text"
                className="input"
                placeholder="예: 집, 회사"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="recipientName">받는 사람</label>
              <input
                id="recipientName"
                type="text"
                className="input"
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="phoneNumber">연락처</label>
              <input
                id="phoneNumber"
                type="text"
                className="input"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="zipCode">우편번호</label>
              <input
                id="zipCode"
                type="text"
                className="input"
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="address1">주소</label>
              <input
                id="address1"
                type="text"
                className="input"
                value={form.address1}
                onChange={(e) => setForm({ ...form, address1: e.target.value })}
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="address2">상세주소 (선택)</label>
              <input
                id="address2"
                type="text"
                className="input"
                value={form.address2}
                onChange={(e) => setForm({ ...form, address2: e.target.value })}
              />
            </div>
            {!editing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <input
                  id="isDefault"
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                <label htmlFor="isDefault" style={{ margin: 0 }}>
                  기본 배송지로 설정
                </label>
              </div>
            )}
            {formError && (
              <div style={{ color: "var(--color-danger)", marginBottom: 8 }}>{formError}</div>
            )}
          </form>
        </Dialog>
      )}
    </div>
  );
}
