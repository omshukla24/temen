import { DocPage, DocSection } from '@/components/DocPage';
import { T } from '@/components/T';
import { TERMS } from '@/features/legal/content';
import { useT } from '@/i18n';

export default function Terms() {
  const { t } = useT();
  return (
    <DocPage title={t('about.terms')} eyebrow={t('about.updated', { date: TERMS.updated })}>
      {TERMS.sections.map((s, i) => (
        <DocSection key={s.title} index={i} title={s.title}>
          {s.body.map((p) => (
            <T key={p} kind="body">
              {p}
            </T>
          ))}
        </DocSection>
      ))}
    </DocPage>
  );
}
