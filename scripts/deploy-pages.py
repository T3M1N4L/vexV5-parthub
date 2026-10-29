"""Publish dist while preserving the custom domain configured in GitHub Pages."""
import json, pathlib, shutil, subprocess, tempfile
project = pathlib.Path(__file__).resolve().parent.parent
repo = 'T3M1N4L/vexV5-parthub'
dist = project / 'dist'
if not (dist / 'index.html').is_file():
    raise SystemExit('Run npm run build first.')
html = (dist / 'index.html').read_text()
if '/vexV5-parthub/' in html:
    raise SystemExit('Refusing to publish a repository-prefixed build; run npm run build without --base overrides.')
settings = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/pages'], text=True))
with tempfile.TemporaryDirectory(prefix='v5-publish-') as directory:
    def run(*args):
        subprocess.run(args, cwd=directory, check=True, stdout=subprocess.DEVNULL)
    run('git', 'clone', '--branch', 'gh-pages', '--single-branch', f'https://github.com/{repo}.git', '.')
    cname = settings.get('cname')
    # Read before replacing tracked artifacts; the user can edit this on GitHub.
    old = pathlib.Path(directory, 'CNAME')
    if cname and old.exists() and old.read_text().strip() != cname:
        raise SystemExit('Pages configuration and CNAME disagree; deployment stopped to preserve domain settings.')
    run('git', 'rm', '-r', '--ignore-unmatch', '.')
    shutil.copytree(dist, directory, dirs_exist_ok=True)
    deployed_cname = pathlib.Path(directory, 'CNAME')
    if cname:
        deployed_cname.write_text(cname + '\n')
    elif deployed_cname.exists():
        deployed_cname.unlink()
    pathlib.Path(directory, '.nojekyll').touch()
    run('git', 'add', '.')
    if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=directory).returncode == 0:
        print('No deployment changes.'); raise SystemExit(0)
    run('git', '-c', 'user.name=Codex', '-c', 'user.email=codex@users.noreply.github.com', 'commit', '-m', 'Publish relative assets and preserve custom domain')
    run('git', 'push', 'origin', 'gh-pages')
    print('Published:', subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=directory, text=True).strip())
    print('Custom domain preserved:', cname or '(none)')
