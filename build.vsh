import os
import log

log.info('start generating html pages from docs.md')

log.info('    cloning latest version of the generator sources ...')
os.system('rm -rf docs_generator/')
os.system('git clone --branch generator https://github.com/vlang/docs docs_generator/')

os.chdir('docs_generator/')!
log.info('    runnning generator...')
$if freebsd {
	// workaround for net.mbedtls not being able to be compiled with tcc:'
	os.system('${@VEXE} -cc clang run .')
} $else {
	os.system('${@VEXE} run .')
}
os.chdir('..')!

log.info('    rsync-ing the output/ folder ...')
os.system('rsync -a docs_generator/output/ ./')

log.info('done generating html pages from docs.md')
