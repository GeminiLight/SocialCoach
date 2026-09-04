"use client";
import { useState } from "react";
import { clsx } from "clsx";
import { Download, Trash2, ChevronRight } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button, Chip, Page, SectionTitle, Sheet, Switch, useToast } from "@/components/ui";
import { isReady, STORAGE_KEY, useByok } from "@/lib/byok";
import { stopSpeaking, unlockSpeech } from "@/lib/speech";
import { useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { COMPETENCIES, SKILLS, skillById, type Lang, type SkillId } from "@/data/taxonomy";
import { compColor } from "@/lib/format";

export default function Settings() {
  const lang = useLang();
  const { profile, proficiency, sessions, settings, setSettings, setLang, updateProfile, setProficiency, reset, customScenarios, bookmarks, practiceDays } = useApp();
  const toast = useToast((s) => s.show);
  const [edit, setEdit] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const byok = useByok();
  const ownModel = isReady(byok);
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  if (!profile) return null;

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, proficiency, sessions, customScenarios, bookmarks, practiceDays, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `socialcoach-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleGoal = (id: SkillId) => {
    const has = profile.goals.includes(id);
    if (has && profile.goals.length <= 1) return;
    updateProfile({ goals: has ? profile.goals.filter((g) => g !== id) : [...profile.goals, id] });
    if (!has && proficiency[id] == null) setProficiency({ ...proficiency, [id]: 2.5 });
  };

  return (
    <Shell>
      <Page className="pt-4 flex flex-col gap-8 lg:pt-9 lg:grid lg:grid-cols-2 lg:gap-x-0 lg:gap-y-12">
        <h1 className="display text-[30px] lg:text-[38px] leading-tight lg:col-span-2">{t(lang, "st_title")}</h1>

        <div className="contents lg:flex lg:flex-col lg:gap-12 lg:pr-10">
        <section className="flex flex-col gap-3">
          <SectionTitle right={<button onClick={() => setEdit(true)} className="press text-[13px] text-ink-3 h-8">{t(lang, "st_edit")}</button>}>{t(lang, "st_profile")}</SectionTitle>
          <div className="card p-4 flex flex-col gap-1">
            <p className="display text-[20px]">{profile.name || (lang === "zh" ? "未命名" : "Unnamed")}</p>
            <p className="text-[14px] text-ink-2 leading-relaxed lg:max-w-[var(--measure)]">{profile.bio || t(lang, "ob_bio_ph")}</p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle right={<button onClick={() => setGoalsOpen(true)} className="press text-[13px] text-ink-3 h-8">{t(lang, "st_edit")}</button>}>{t(lang, "st_goals")}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {profile.goals.map((g) => <Chip key={g}>{skillById(g).name[lang]}</Chip>)}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{t(lang, "st_prefs")}</SectionTitle>
          <div className="card divide-y divide-line">
          <Row label={t(lang, "st_language")}>
            <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium">
              {(["zh", "en"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={clsx("press px-3 h-7 rounded-full", lang === l ? "bg-ink text-paper" : "text-ink-3")}>{l === "zh" ? "中文" : "English"}</button>
              ))}
            </div>
          </Row>
          <Row label={t(lang, "st_theme")}>
            <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium">
              {(["system", "light", "dark"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSettings({ theme: v })}
                  className={clsx("press px-3 h-7 rounded-full", (settings.theme ?? "system") === v ? "bg-ink text-paper" : "text-ink-3")}
                >
                  {t(lang, v === "system" ? "st_theme_system" : v === "light" ? "st_theme_light" : "st_theme_dark")}
                </button>
              ))}
            </div>
          </Row>
          <Row label={t(lang, "st_voice")}>
            <Switch
              checked={settings.tts}
              // Turning it on is a user gesture — the only thing iOS accepts to
              // unlock speech. Spend it here so the first line actually plays.
              onChange={(v) => {
                if (v) unlockSpeech();
                else stopSpeaking();
                setSettings({ tts: v });
              }}
              label={t(lang, "st_voice")}
            />
          </Row>
          </div>
        </section>

        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-12 lg:border-l lg:border-line lg:pl-10">
        <section className="flex flex-col gap-3">
          <SectionTitle>{t(lang, "st_model")}</SectionTitle>
          <button onClick={byok.openSheet} className="press card card-link w-full text-left p-4 flex items-center gap-3">
            <span className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[14px] font-medium">{ownModel ? `${t(lang, "st_model_own")} · ${byok.fastModel}` : t(lang, "st_model_default")}</span>
              <span className="text-[12px] text-ink-3 leading-snug">{ownModel ? t(lang, "st_model_local") : t(lang, "st_model_row_hint")}</span>
            </span>
            <ChevronRight size={16} className="text-ink-4 shrink-0" />
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{t(lang, "st_data")}</SectionTitle>
          <div className="card divide-y divide-line">
            <button onClick={exportData} className="press w-full flex items-center gap-3 px-4 h-13 py-3.5 text-left text-[14px] font-medium"><Download size={17} className="text-ink-3" />{t(lang, "st_export")}<ChevronRight size={16} className="ml-auto text-ink-4" /></button>
            <button onClick={() => setConfirm(true)} className="press w-full flex items-center gap-3 px-4 py-3.5 text-left text-[14px] font-medium text-danger"><Trash2 size={17} />{t(lang, "st_reset")}</button>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <SectionTitle>{t(lang, "st_about")}</SectionTitle>
          <p className="text-[13px] text-ink-3 leading-relaxed lg:max-w-[var(--measure)]">{t(lang, "st_about_body")}</p>
          <a className="text-[13px] text-teal underline underline-offset-2" href="https://arxiv.org/abs/2606.04155" target="_blank" rel="noreferrer">arXiv:2606.04155</a>
        </section>
        </div>
      </Page>

      <Sheet open={edit} onClose={() => setEdit(false)} title={t(lang, "st_profile")}>
        <div className="flex flex-col gap-4 pt-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(lang, "ob_name_ph")} className="h-12 px-4 rounded-xl bg-card border border-line text-[15px]" maxLength={24} />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t(lang, "ob_bio_ph")} rows={5} className="px-4 py-3 rounded-xl bg-card border border-line text-[15px] leading-relaxed" maxLength={300} />
          <Button block onClick={() => { updateProfile({ name: name.trim(), bio: bio.trim() }); setEdit(false); toast(t(lang, "done")); }}>{t(lang, "save")}</Button>
        </div>
      </Sheet>

      <Sheet open={goalsOpen} onClose={() => setGoalsOpen(false)} title={t(lang, "st_goals")}>
        <div className="flex flex-col gap-4 pt-2">
          {COMPETENCIES.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <span className="eyebrow" style={{ color: compColor(c.id, 0.45, 0.09) }}>{c.name[lang]}</span>
              <div className="flex flex-wrap gap-2">
                {SKILLS.filter((s) => s.competency === c.id).map((s) => (
                  <Chip key={s.id} active={profile.goals.includes(s.id)} onClick={() => toggleGoal(s.id)}>{s.name[lang]}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t(lang, "st_reset")}>
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-[14px] text-ink-2 leading-relaxed">{t(lang, "st_reset_confirm")}</p>
          <Button block variant="danger" onClick={() => { byok.clear(); try { localStorage.removeItem(STORAGE_KEY); } catch {} reset(); setConfirm(false); }}>{t(lang, "st_reset")}</Button>
          <Button block variant="ghost" onClick={() => setConfirm(false)}>{t(lang, "cancel")}</Button>
        </div>
      </Sheet>
    </Shell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[14px] font-medium">{label}</span>
      {children}
    </div>
  );
}
