import numpy as np
import omero
from omero.gateway import BlitzGateway
import os

from util import get_numpy_type, decrypt_credentials


class Omero:
    def __init__(self, host, usr, pwd):
        self.host = host
        self.usr = usr
        self.pwd = pwd
        self.connected = False

    def switch_user_group(self):
        self.conn.SERVICE_OPTS.setOmeroGroup('-1')

    def connect(self):
        print('Connecting to Omero...')
        self.conn = BlitzGateway(self.usr, self.pwd, host=self.host, secure=True)
        if not self.conn.connect():
            self.disconnect()
            print('Connection error')
            raise ConnectionError
        self.conn.c.enableKeepAlive(60)
        self.connected = True
        print(f'Connected as {self.conn.getUser().getName()}')

    def disconnect(self):
        self.conn.close()
        self.connected = False

    def list_projects(self):
        projects = self.conn.listProjects()      # may include other users' data
        for project in projects:
            print_omero_object(project)

    def get_project_images(self, project_id):
        image_objects = []
        project = self.conn.getObject('Project', project_id)
        for dataset in project.listChildren():
            for image_object in dataset.listChildren():
                image_objects.append(image_object)
        return image_objects

    def open_dataset(self, project_id, dataset_name):
        project = self.conn.getObject('Project', project_id)
        dataset = project.findChildByName(dataset_name)
        return dataset

    def get_slide_image(self, image_object, pixels):
        w, h, zs, cs, ts = self.get_size(image_object)
        read_size = 10240
        ny = int(np.ceil(h / read_size))
        nx = int(np.ceil(w / read_size))

        dtype = get_numpy_type(pixels.getPixelsType().getValue())
        slide_image = np.zeros((h, w, cs), dtype=dtype)

        try:
            pixels_store = self.conn.createRawPixelsStore()
            pixels_id = image_object.getPixelsId()
            pixels_store.setPixelsId(pixels_id, False, self.conn.SERVICE_OPTS)
            for y in range(ny):
                for x in range(nx):
                    sx, sy = x * read_size, y * read_size
                    tw, th = read_size, read_size
                    if sx + tw > w:
                        tw = w - sx
                    if sy + th > h:
                        th = h - sy
                    for c in range(cs):
                        tile0 = pixels_store.getTile(0, c, 0, sx, sy, tw, th)
                        tile = np.frombuffer(tile0, dtype=dtype)
                        tile.resize(th, tw)
                        slide_image[sy:sy + th, sx:sx + tw, c] = tile
        except Exception as e:
            print(e)
            slide_image = None
        finally:
            pixels_store.close()
        return slide_image

    def get_size(self, image_object):
        xs, ys = image_object.getSizeX(), image_object.getSizeY()
        zs, cs, ts = image_object.getSizeZ(), image_object.getSizeC(), image_object.getSizeT()
        return xs, ys, zs, cs, ts

    def get_metadata(self, image_object):
        for omero_annotation in image_object.listAnnotations():
            type = omero_annotation.OMERO_TYPE
            if type == omero.model.MapAnnotationI:
                for annotation in omero_annotation.getMapValue():
                    print(annotation.name, annotation.value)
            elif type == omero.model.CommentAnnotationI:
                print(omero_annotation.getValue())

    def get_original_slide_files(self, image_object):
        return image_object.getFileset().listFiles()

    def get_magnification(self, image_object):
        return image_object.getObjectiveSettings().getObjective().getNominalMagnification()

    def get_image_annotations(self, image_object, annotation_keys):
        annotations = {}
        for omero_annotation in image_object.listAnnotations():
            if omero_annotation.OMERO_TYPE == omero.model.MapAnnotationI:
                for annotation_key in annotation_keys:
                    for annotation in omero_annotation.getMapValue():
                        if annotation.name.lower() == annotation_key.lower():
                            annotations[annotation_key] = annotation.value
        return annotations


def print_omero_object(object, indent=0):
    """
    Helper method to display info about OMERO objects.
    Not all objects will have a "name" or owner field.
    """
    print("""%s%s:%s  Name:"%s" (owner=%s)""" % (
        " " * indent,
        object.OMERO_CLASS,
        object.getId(),
        object.getName(),
        object.getOwnerOmeName()))

    try:
        for child in object.listChildren():
            print('\t', child.getName())
    except:
        pass

if __name__ == '__main__':
    host = 'ssl://omero-prod.camp.thecrick.org'
    pri_key_file = os.path.expanduser('~/omero.pri.key')
    credentials_filename = '.omero_credentials'

    usr, pwd = decrypt_credentials(pri_key_file, credentials_filename)
    omero = Omero(host, usr, pwd)
    omero.connect()

    omero.switch_user_group()

    project_id = 12345
    image_objects = omero.get_project_images(project_id)
    for image_object in image_objects:
        print_omero_object(image_object)
        print(omero.get_size(image_object))

    omero.disconnect()