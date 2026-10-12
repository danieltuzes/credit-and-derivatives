import { runContentCli } from 'explico/compiler/cli-main';
import { courseConfig } from '../content/course.config';

process.exitCode = await runContentCli(courseConfig);
