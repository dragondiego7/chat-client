# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://atlas.hashicorp.com/search.
  config.vm.box = "debian"
  config.vm.box_url = "https://dl.dropboxusercontent.com/u/3523744/boxes/debian-8.1-amd64-lxc-puppet/debian-8.1-lxc-puppet.box"

  # Disable automatic box update checking. If you disable this, then
  # boxes will only be checked for updates when the user runs
  # `vagrant box outdated`. This is not recommended.
  # config.vm.box_check_update = false

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  config.vm.network "forwarded_port", guest: 80, host: 8080

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  # config.vm.network "private_network", ip: "192.168.33.10"

  # Create a public network, which generally matched to bridged network.
  # Bridged networks make the machine appear as another physical device on
  # your network.
  config.vm.network "public_network", bridge: "eth0", ip: "192.168.0.150"

  # Share an additional folder to the guest VM. The first argument is
  # the path on the host to the actual folder. The second argument is
  # the path on the guest to mount the folder. And the optional third
  # argument is a set of non-required options.
  config.vm.synced_folder "./", "/var/www/html"

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  #
  config.vm.provider "virtualbox" do |vb|
  #   # Display the VirtualBox GUI when booting the machine
  #  vb.gui = true
    vb.customize ["modifyvm", :id, "--usb", "off"]
    vb.customize ["modifyvm", :id, "--usbehci", "off"]
  #
  #   # Customize the amount of memory on the VM:
  #   vb.memory = "1024"
  end
  #
  # View the documentation for the provider you are using for more
  # information on available options.

  # Define a Vagrant Push strategy for pushing to Atlas. Other push strategies
  # such as FTP and Heroku are also available. See the documentation at
  # https://docs.vagrantup.com/v2/push/atlas.html for more information.
  # config.push.define "atlas" do |push|
  #   push.app = "YOUR_ATLAS_USERNAME/YOUR_APPLICATION_NAME"
  # end

  # Enable provisioning with a shell script. Additional provisioners such as
  # Puppet, Chef, Ansible, Salt, and Docker are also available. Please see the
  # documentation for more information about their specific syntax and use.
  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    sudo apt-get install -y apache2
    sudo apt-get install -y apache2.2-common
    sudo apt-get install -y sqlite3
    sudo apt-get install -y php5
    sudo apt-get install -y php5-sqlite
cat > /etc/apache2/sites-available/000-default.conf << EOF
<VirtualHost *:80>
	\# The ServerName directive sets the request scheme, hostname and port that
	\# the server uses to identify itself. This is used when creating
	\# redirection URLs. In the context of virtual hosts, the ServerName
	\# specifies what hostname must appear in the request's Host: header to
	\# match this virtual host. For the default virtual host (this file) this
	\# value is not decisive as it is used as a last resort host regardless.
	\# However, you must set it for any further virtual host explicitly.
	\#ServerName www.example.com
	ServerAdmin webmaster@localhost
	DocumentRoot /var/www/html
	
	<Directory /var/www/html/>
		AllowOverride All
	</Directory>
	\# Available loglevels: trace8, ..., trace1, debug, info, notice, warn,
	\# error, crit, alert, emerg.
	\# It is also possible to configure the loglevel for particular
	\# modules, e.g.
	\#LogLevel info ssl:warn
	ErrorLog ${APACHE_LOG_DIR}/error.log
	CustomLog ${APACHE_LOG_DIR}/access.log combined
	\# For most configuration files from conf-available/, which are
	\# enabled or disabled at a global level, it is possible to
	\# include a line for only one particular virtual host. For example the
	\# following line enables the CGI configuration for this host only
	\# after it has been globally disabled with "a2disconf".
	\#Include conf-available/serve-cgi-bin.conf
</VirtualHost>
\# vim: syntax=apache ts=4 sw=4 sts=4 sr noet 	
EOF
    sudo a2enmod rewrite
    cd /tmp
    wget https://nodejs.org/dist/v5.2.0/node-v5.2.0-linux-x64.tar.gz 
    tar xvf node-v5.2.0-linux-x64.tar.gz 
    sudo mkdir /opt/node
    sudo mv node-v5.2.0-linux-x64 /opt/node/
    sudo update-alternatives --install /usr/bin/node node /opt/node/node-v5.2.0-linux-x64/bin/node 1000
    sudo update-alternatives --install /usr/bin/npm npm /opt/node/node-v5.2.0-linux-x64/bin/npm 1000
  SHELL
end
