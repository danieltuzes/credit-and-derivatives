import { runValidateContent } from 'explico/compiler/validate-content';
import { courseConfig } from '../content/course.config';

process.exitCode = await runValidateContent(courseConfig);
