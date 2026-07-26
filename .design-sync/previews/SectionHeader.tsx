import { SectionHeader, SubsectionHeader, CaptionText, SmallText } from 'flowviz';
import { Surface } from '../preview-lib/theme';

export const Default = () => (
  <Surface>
    <SectionHeader>Initial access</SectionHeader>
  </Surface>
);

export const WithSubsection = () => (
  <Surface>
    <SectionHeader>Attack flow</SectionHeader>
    <SubsectionHeader>Credential access</SubsectionHeader>
  </Surface>
);

/** The header in the context it actually ships in — over a block of body copy. */
export const InContext = () => (
  <Surface width={460}>
    <SectionHeader>Technique details</SectionHeader>
    <CaptionText>
      The adversary used a spearphishing attachment to gain execution on a workstation belonging to a
      finance-team member, then established persistence via a scheduled task.
    </CaptionText>
    <SmallText>Source: paragraph 4 of the reporting article</SmallText>
  </Surface>
);
