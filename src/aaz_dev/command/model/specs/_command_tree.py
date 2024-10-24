from command.model.configuration import CMDStageField, CMDHelp, CMDCommandExample
from command.model.configuration._fields import CMDCommandNameField, CMDVersionField
from schematics.models import Model
from schematics.common import NOT_NONE
from schematics.types import ModelType, ListType, DictType

from ._resource import CMDSpecsResource


class CMDSpecsSimpleCommand(Model):
    names = ListType(field=CMDCommandNameField(), min_size=1, required=True)  # full name of a command

    class Options:
        serialize_when_none = False


class CMDSpecsSimpleCommandGroup(Model):
    names = ListType(field=CMDCommandNameField(), min_size=1, required=True)  # full name of a command group
    command_groups = DictType(
        field=ModelType("CMDSpecsSimpleCommandGroup"),
        serialized_name="commandGroups",
        deserialize_from="commandGroups",
        export_level=NOT_NONE,
    )
    commands = DictType(
        field=ModelType(CMDSpecsSimpleCommand),
        export_level=NOT_NONE,
    )

    class Options:
        serialize_when_none = False


class CMDSpecsSimpleCommandTree(Model):
    root = ModelType(
        CMDSpecsSimpleCommandGroup
    )  # the root node

    class Options:
        serialize_when_none = False


class CMDSpecsCommandVersion(Model):
    name = CMDVersionField(required=True)
    stage = CMDStageField()
    resources = ListType(ModelType(CMDSpecsResource), required=True, min_size=1)
    examples = ListType(ModelType(CMDCommandExample))

    class Options:
        serialize_when_none = False


class CMDSpecsCommand(Model):
    names = ListType(field=CMDCommandNameField(), min_size=1, required=True)  # full name of a command
    help = ModelType(CMDHelp, required=True)
    versions = ListType(  # None only when the command is a partial command
        ModelType(CMDSpecsCommandVersion),
        min_size=1,
        export_level=NOT_NONE,
    )

    class Options:
        serialize_when_none = False


class CMDSpecsCommandGroup(Model):
    names = ListType(field=CMDCommandNameField(), min_size=1, required=True)  # full name of a command group
    help = ModelType(CMDHelp)

    command_groups = DictType(
        field=ModelType("CMDSpecsCommandGroup"),
        serialized_name="commandGroups",
        deserialize_from="commandGroups",
        export_level=NOT_NONE,
    )
    commands = DictType(
        field=ModelType(CMDSpecsCommand),
        export_level=NOT_NONE,
    )

    class Options:
        serialize_when_none = False


class CMDSpecsCommandTree(Model):
    root = ModelType(
        CMDSpecsCommandGroup
    )  # the root node

    class Options:
        serialize_when_none = False
