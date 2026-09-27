import { DocPage, DocSection } from '@/components/DocPage';
import { T } from '@/components/T';
import { PRIVACY } from '@/features/legal/content';
import { useT } from '@/i18n';

export default function Privacy() {
  const { t } = useT();
  return (
    <DocPage title={t('about.privacy')} eyebrow={t('about.updated', { date: PRIVACY.updated })}>
      {PRIVACY.sections.map((s, i) => (
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
