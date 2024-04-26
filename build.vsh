import os
import log

log.info('start generating html pages from docs.md')

log.info('    cloning latest version of the generator sources ...')
os.system('rm -rf docs_generator/')
os.system('git clone --branch generator https://github.com/vlang/docs docs_generator/')

os.chdir('docs_generator/')!
log.info('    installing dependencies ...')
$if freebsd {
	log.info('    installing dependencies TODO: tcc can not compile mbedtls and thus vpm on FreeBSD, you will have to run `v install` manually instead ...')
} $else {
	os.system('v install')
}
log.info('    runnning generator...')
os.system('v run .')
os.chdir('..')!

log.info('    rsync-ing the output/ folder ...')
os.system('rsync -a docs_generator/output/ ./')

log.info('done generating html pages from docs.md')
