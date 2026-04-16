sudo useradd -r -g www-data -s /usr/sbin/nologin django
sudo mkdir -p /var/log/quizonline
sudo touch /var/log/quizonline/gunicorn-access.log
sudo touch /var/log/quizonline/gunicorn-error.log
sudo chown -R django:www-data /var/log/quizonline
sudo chmod 755 /var/log/quizonline
sudo chmod 644 /var/log/quizonline/gunicorn-access.log /var/log/quizonline/gunicorn-error.log
sudo mkdir -p /var/www/django_websites/QuizOnline/quizonline-server/run
sudo chown -R django:www-data /var/www/django_websites/QuizOnline/quizonline-server/run
sudo chmod 755 /var/www/django_websites/QuizOnline/quizonline-server/run
sudo systemctl restart quizonline-gunicorn
sudo systemctl restart quizonline-celery
sudo systemctl restart qtu uizonline-celery-beat
