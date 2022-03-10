from schematics.models import Model
from schematics.types import PolyModelType

from ._arg_builder import CMDArgBuilder
from ._fields import CMDVariantField
from ._schema import CMDSchemaBaseField, CMDSchema, CMDClsSchema, CMDClsSchemaBase, \
    CMDObjectSchemaBase, CMDArraySchemaBase, CMDObjectSchemaDiscriminator
from ._utils import CMDDiffLevelEnum


class CMDRequestJson(Model):
    """Used for Request Body and Instance Update operation"""

    # properties as tags
    ref = CMDVariantField()

    # properties as nodes
    schema = PolyModelType(CMDSchema, allow_subclasses=True)

    class Options:
        serialize_when_none = False

    def generate_args(self):
        if not self.schema:
            return []
        assert isinstance(self.schema, CMDSchema)
        builder = CMDArgBuilder.new_builder(schema=self.schema)
        args = builder.get_args()
        return args

    def diff(self, old, level):
        diff = {}
        if level >= CMDDiffLevelEnum.BreakingChange:
            if (self.ref is not None) != (old.ref is not None):
                diff["ref"] = f"{old.ref} != {self.ref}"
            schema_diff = self.schema.diff(old.schema, level)
            if schema_diff:
                diff["schema"] = schema_diff

        if level >= CMDDiffLevelEnum.Associate:
            if self.ref != old.ref:
                diff["ref"] = f"{old.ref} != {self.ref}"
        return diff

    def reformat(self, schema_cls_map, **kwargs):
        if self.schema:
            if getattr(self.schema, 'cls', None):
                if not schema_cls_map.get(self.schema.cls, None):
                    schema_cls_map[self.schema.cls] = self.schema
                else:
                    # replace by CMDClsSchema
                    self.schema = CMDClsSchema.build_from_schema(self.schema)

            _iter_over_schema(self.schema, schema_cls_map)

            self.schema.reformat(**kwargs)


class CMDResponseJson(Model):
    # properties as tags
    var = CMDVariantField()

    # properties as nodes
    schema = CMDSchemaBaseField(required=True)

    class Options:
        serialize_when_none = False

    def diff(self, old, level):
        diff = {}
        if level >= CMDDiffLevelEnum.BreakingChange:
            schema_diff = self.schema.diff(old.schema, level)
            if schema_diff:
                diff["schema"] = schema_diff

        if level >= CMDDiffLevelEnum.Associate:
            if self.var != old.var:
                diff["var"] = f"{old.var} != {self.var}"
        return diff

    def reformat(self, schema_cls_map, **kwargs):
        if getattr(self.schema, 'cls', None):
            if self.schema.cls in schema_cls_map:
                self.schema = CMDClsSchemaBase.build_from_schema_base(self.schema)
            else:
                schema_cls_map[self.schema.cls] = self.schema
        _iter_over_schema(self.schema, schema_cls_map)
        self.schema.reformat(**kwargs)


def _iter_over_schema(schema, schema_cls_map):
    if schema.frozen:
        return
    if isinstance(schema, (CMDObjectSchemaBase, CMDObjectSchemaDiscriminator)):
        if schema.props:
            for idx in range(len(schema.props)):
                s = schema.props[idx]
                if getattr(s, 'cls', None):
                    if not schema_cls_map.get(s.cls, None):
                        schema_cls_map[s.cls] = s
                    else:
                        # replace by CMDClsSchema
                        schema.props[idx] = CMDClsSchema.build_from_schema(s)
            for prop in schema.props:
                _iter_over_schema(prop, schema_cls_map)

        if schema.discriminators:
            for disc in schema.discriminators:
                _iter_over_schema(disc, schema_cls_map)

        if isinstance(schema, CMDObjectSchemaBase) and schema.additional_props and schema.additional_props.item:
            s = schema.additional_props.item
            if getattr(s, 'cls', None):
                if not schema_cls_map.get(s.cls, None):
                    schema_cls_map[s.cls] = s
                else:
                    # replace by CMDClsBaseSchema
                    schema.additional_props.item = CMDClsSchemaBase.build_from_schema_base(s)
            _iter_over_schema(schema.additional_props.item, schema_cls_map)

    elif isinstance(schema, CMDArraySchemaBase):
        s = schema.item
        if getattr(s, 'cls', None):
            if not schema_cls_map.get(s.cls, None):
                schema_cls_map[s.cls] = s
            else:
                # replace by CMDClsBaseSchema
                schema.item = CMDClsSchemaBase.build_from_schema_base(s)
        _iter_over_schema(schema.item, schema_cls_map)
    elif isinstance(schema, CMDClsSchemaBase):
        cls_name = schema.type[1:]
        if cls_name not in schema_cls_map:
            # set this cls name as None, in order to check where this cls_name miss cls definition
            schema_cls_map[cls_name] = None
