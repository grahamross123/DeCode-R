import numpy as np
from getpass import getpass
import rsa
import os


def get_numpy_type(s):
    types = {'uint8': np.uint8, 'uint16': np.uint16, 'uint32': np.uint32, 'float32': np.float32, 'float64': np.float64}
    return types[s]


def generate_asymmetric_keys(pub_key_file, pri_key_file):
    pub_key, pri_key = rsa.newkeys(2048)
    with open(pub_key_file, 'w') as pub_file, open(pri_key_file, 'w') as pri_file:
        pub_file.write(pub_key.save_pkcs1().decode())
        pri_file.write(pri_key.save_pkcs1().decode())


def create_credentials_file(pub_key_file, credentials_filename):
    with open(pub_key_file, 'r') as key_file, open(credentials_filename, 'wb') as enc_file:
        keydata = key_file.read().encode()
        pub_key = rsa.PublicKey.load_pkcs1(keydata)
        enc_cred = rsa.encrypt((input('Username: ') + '\t' + getpass('Password: ')).encode(), pub_key)
        enc_file.write(enc_cred)


def decrypt_credentials(pri_key_file, credentials_filename):
    with open(credentials_filename, 'rb') as cred_f, open(pri_key_file, 'rb') as key_file:
        keydata = key_file.read()
        pri_key = rsa.PrivateKey.load_pkcs1(keydata)
        cred = cred_f.read()
        dec_cred = rsa.decrypt(cred, pri_key).decode().split()
        usr = dec_cred[0]
        pwd = dec_cred[1]
    return usr, pwd


if __name__ == '__main__':
    pub_key_file = os.path.expanduser('~/omero.pub.key')    # for encoding (in private space)
    pri_key_file = os.path.expanduser('~/omero.pri.key')    # for decoding (in private space)
    credentials_filename = '.omero_credentials'     # encoded credentials (in public space)

    # create keys and credentials file
    generate_asymmetric_keys(pub_key_file, pri_key_file)
    create_credentials_file(pub_key_file, credentials_filename)

    # test
    usr, pwd = decrypt_credentials(pri_key_file, credentials_filename)
    print(usr, pwd)