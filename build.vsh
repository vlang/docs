import os
import log

log.info('start generating html pages from docs.md')

log.info('    cloning latest version of the generator sources ...')
os.system('rm -rf docs_generator/')
os.system('git clone --branch generator https://github.com/vlang/docs docs_generator/')

os.chdir('docs_generator/')!
log.info('    runnning generator...')
os.system('${@VEXE} run .')
os.chdir('..')!

log.info('    rsync-ing the output/ folder ...')
os.system('rsync -a docs_generator/output/ ./')

log.info('done generating html pages from docs.md')
